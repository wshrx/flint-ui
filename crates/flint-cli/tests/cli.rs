use std::collections::HashMap;
use std::fs;
use std::io::{Read, Write};
use std::net::TcpListener;
use std::path::{Path, PathBuf};
use std::process::{Command, Output};
use std::sync::Arc;
use std::sync::atomic::{AtomicBool, Ordering};
use std::thread::{self, JoinHandle};
use std::time::Duration;
use tempfile::TempDir;

fn bin() -> PathBuf {
    PathBuf::from(env!("CARGO_BIN_EXE_flint-ui"))
}

fn write(path: &Path, text: &str) {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).unwrap();
    }
    fs::write(path, text).unwrap();
}

fn registry(root: &Path, items: &str, files: &[(&str, &str)]) -> PathBuf {
    let dir = root.join("registry");
    write(&dir.join("registry.json"), items);
    for (path, text) in files {
        write(&dir.join(path), text);
    }
    dir
}

fn project(root: &Path) -> PathBuf {
    let dir = root.join("project");
    fs::create_dir_all(&dir).unwrap();
    write(
        &dir.join("package.json"),
        "{\"name\":\"t\",\"private\":true}\n",
    );
    dir
}

fn run(cwd: &Path, args: &[&str]) -> Output {
    Command::new(bin())
        .current_dir(cwd)
        .args(args)
        .output()
        .unwrap()
}

fn stderr(output: &Output) -> String {
    String::from_utf8_lossy(&output.stderr).to_string()
}

fn stdout(output: &Output) -> String {
    String::from_utf8_lossy(&output.stdout).to_string()
}

fn run_env(cwd: &Path, args: &[&str], env: &[(&str, &str)]) -> Output {
    let mut command = Command::new(bin());
    command.current_dir(cwd).args(args);
    for (key, value) in env {
        command.env(key, value);
    }
    command.output().unwrap()
}

/// A tiny HTTP registry: every path in `files` is served, everything else is a
/// 404. It shuts down when the test drops it, so no test leaves a listener.
struct Http {
    base: String,
    stop: Arc<AtomicBool>,
    thread: Option<JoinHandle<()>>,
}

impl Http {
    fn new(files: &[(&str, &str)]) -> Self {
        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        let port = listener.local_addr().unwrap().port();
        listener.set_nonblocking(true).unwrap();
        let stop = Arc::new(AtomicBool::new(false));
        let flag = Arc::clone(&stop);
        let routes: HashMap<String, Vec<u8>> = files
            .iter()
            .map(|(path, body)| (path.to_string(), body.as_bytes().to_vec()))
            .collect();

        let thread = thread::spawn(move || {
            while !flag.load(Ordering::Relaxed) {
                match listener.accept() {
                    Ok((mut stream, _)) => {
                        let mut buffer = [0u8; 4096];
                        let read = stream.read(&mut buffer).unwrap_or(0);
                        let request = String::from_utf8_lossy(&buffer[..read]).to_string();
                        let mut parts = request.split_whitespace();
                        let method = parts.next().unwrap_or("GET");
                        let path = parts
                            .next()
                            .unwrap_or("/")
                            .trim_start_matches('/')
                            .split('?')
                            .next()
                            .unwrap_or("");
                        match routes.get(path) {
                            Some(body) => {
                                let _ = write!(
                                    stream,
                                    "HTTP/1.1 200 OK\r\nContent-Length: {}\r\nConnection: close\r\n\r\n",
                                    body.len()
                                );
                                if method != "HEAD" {
                                    let _ = stream.write_all(body);
                                }
                            }
                            None => {
                                let _ = stream.write_all(
                                    b"HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\nConnection: close\r\n\r\n",
                                );
                            }
                        }
                    }
                    Err(error) if error.kind() == std::io::ErrorKind::WouldBlock => {
                        thread::sleep(Duration::from_millis(2));
                    }
                    Err(_) => break,
                }
            }
        });

        Self {
            base: format!("http://127.0.0.1:{port}"),
            stop,
            thread: Some(thread),
        }
    }
}

impl Drop for Http {
    fn drop(&mut self) {
        self.stop.store(true, Ordering::Relaxed);
        if let Some(thread) = self.thread.take() {
            let _ = thread.join();
        }
    }
}

#[test]
fn add_copies_dependencies_declared_later() {
    let temp = TempDir::new().unwrap();
    let reg = registry(
        temp.path(),
        r#"{"items":[
          {"name":"a","type":"registry:ui","registryDependencies":["b"],"files":[{"path":"components/a.tsx","type":"registry:ui"}]},
          {"name":"b","type":"registry:ui","files":[{"path":"components/b.tsx","type":"registry:ui"}]}
        ]}"#,
        &[
            ("components/a.tsx", "export const A = 1\n"),
            ("components/b.tsx", "export const B = 1\n"),
        ],
    );
    let cwd = project(temp.path());
    let output = run(&cwd, &["add", "a", "--registry", reg.to_str().unwrap()]);
    assert!(output.status.success(), "{}", stderr(&output));
    assert!(cwd.join("src/components/a.tsx").exists());
    assert!(cwd.join("src/components/b.tsx").exists());
}

#[test]
fn rejects_a_path_that_escapes_the_registry() {
    let temp = TempDir::new().unwrap();
    let reg = registry(
        temp.path(),
        r#"{"items":[{"name":"bad","type":"registry:ui","files":[{"path":"../escape.ts","type":"registry:ui"}]}]}"#,
        &[],
    );
    let cwd = project(temp.path());
    let output = run(&cwd, &["add", "bad", "--registry", reg.to_str().unwrap()]);
    assert!(!output.status.success());
    assert!(stderr(&output).contains("escapes the registry"));
    assert!(!cwd.join("escape.ts").exists());
}

#[test]
fn reads_every_file_before_writing_the_first() {
    let temp = TempDir::new().unwrap();
    let reg = registry(
        temp.path(),
        r#"{"items":[{"name":"pack","type":"registry:ui","files":[
          {"path":"components/first.tsx","type":"registry:ui"},
          {"path":"components/second.tsx","type":"registry:ui"}
        ]}]}"#,
        &[("components/first.tsx", "export const First = 1\n")],
    );
    let cwd = project(temp.path());
    let output = run(&cwd, &["add", "pack", "--registry", reg.to_str().unwrap()]);
    assert!(!output.status.success());
    assert!(stderr(&output).contains("Missing registry file"));
    assert!(!cwd.join("src/components/first.tsx").exists());
}

#[test]
fn init_dry_run_writes_nothing() {
    let temp = TempDir::new().unwrap();
    let reg = registry(
        temp.path(),
        r#"{"items":[{"name":"lib","type":"registry:lib","files":[{"path":"lib/lib.ts","type":"registry:lib"}]}]}"#,
        &[("lib/lib.ts", "export const lib = 1\n")],
    );
    let cwd = project(temp.path());
    let output = run(
        &cwd,
        &["init", "--dry-run", "--registry", reg.to_str().unwrap()],
    );
    assert!(output.status.success(), "{}", stderr(&output));
    assert!(stdout(&output).contains("would write flint.json"));
    assert!(!cwd.join("flint.json").exists());
    assert!(!cwd.join("src").exists());
}

#[test]
fn init_leaves_no_config_when_a_file_is_missing() {
    let temp = TempDir::new().unwrap();
    let reg = registry(
        temp.path(),
        r#"{"items":[{"name":"lib","type":"registry:lib","files":[{"path":"lib/missing.ts","type":"registry:lib"}]}]}"#,
        &[],
    );
    let cwd = project(temp.path());
    let output = run(&cwd, &["init", "--registry", reg.to_str().unwrap()]);
    assert!(!output.status.success());
    assert!(!cwd.join("flint.json").exists());
}

#[test]
fn diff_counts_lines_without_the_final_tail() {
    let temp = TempDir::new().unwrap();
    let reg = registry(
        temp.path(),
        r#"{"items":[{"name":"widget","type":"registry:ui","files":[{"path":"components/widget.tsx","type":"registry:ui"}]}]}"#,
        &[("components/widget.tsx", "one\ntwo\nthree\n")],
    );
    let cwd = project(temp.path());
    assert!(
        run(
            &cwd,
            &["add", "widget", "--registry", reg.to_str().unwrap()]
        )
        .status
        .success()
    );
    fs::write(
        cwd.join("src/components/widget.tsx"),
        "one\ntwo\nthree\nfour\n",
    )
    .unwrap();
    let output = run(
        &cwd,
        &["diff", "widget", "--registry", reg.to_str().unwrap()],
    );
    assert_eq!(output.status.code(), Some(1));
    assert!(
        stdout(&output).contains("(4 → 3 lines)"),
        "{}",
        stdout(&output)
    );
}

#[test]
fn absolute_root_is_honoured() {
    let temp = TempDir::new().unwrap();
    let reg = registry(
        temp.path(),
        r#"{"items":[{"name":"a","type":"registry:ui","files":[{"path":"components/a.tsx","type":"registry:ui"}]}]}"#,
        &[("components/a.tsx", "export const A = 1\n")],
    );
    let cwd = project(temp.path());
    let target = temp.path().join("absolute-output");
    let output = run(
        &cwd,
        &[
            "add",
            "a",
            "--root",
            target.to_str().unwrap(),
            "--registry",
            reg.to_str().unwrap(),
        ],
    );
    assert!(output.status.success(), "{}", stderr(&output));
    assert!(target.join("components/a.tsx").exists());
}

#[test]
fn unknown_flags_fail_before_writing() {
    let temp = TempDir::new().unwrap();
    let reg = registry(
        temp.path(),
        r#"{"items":[{"name":"a","type":"registry:ui","files":[{"path":"components/a.tsx","type":"registry:ui"}]}]}"#,
        &[("components/a.tsx", "export const A = 1\n")],
    );
    let cwd = project(temp.path());
    let output = run(
        &cwd,
        &["add", "a", "--dryrun", "--registry", reg.to_str().unwrap()],
    );
    assert!(!output.status.success());
    assert!(!cwd.join("src/components/a.tsx").exists());
}

#[test]
fn malformed_config_names_the_file() {
    let temp = TempDir::new().unwrap();
    let reg = registry(
        temp.path(),
        r#"{"items":[{"name":"a","type":"registry:ui","files":[{"path":"components/a.tsx","type":"registry:ui"}]}]}"#,
        &[("components/a.tsx", "export const A = 1\n")],
    );
    let cwd = project(temp.path());
    write(&cwd.join("flint.json"), "[]\n");
    let output = run(&cwd, &["list", "--registry", reg.to_str().unwrap()]);
    assert!(!output.status.success());
    assert!(stderr(&output).contains("must contain a JSON object"));
}

#[test]
fn copies_from_a_local_http_registry() {
    let temp = TempDir::new().unwrap();
    let reg = registry(
        temp.path(),
        r#"{"items":[{"name":"a","type":"registry:ui","files":[{"path":"components/a.tsx","type":"registry:ui"}]}]}"#,
        &[("components/a.tsx", "export const A = 1\n")],
    );
    let listener = TcpListener::bind("127.0.0.1:0").unwrap();
    let port = listener.local_addr().unwrap().port();
    let base = reg.clone();
    std::thread::spawn(move || {
        for _ in 0..2 {
            let (mut stream, _) = listener.accept().unwrap();
            let mut buffer = [0u8; 4096];
            let read = stream.read(&mut buffer).unwrap();
            let request = String::from_utf8_lossy(&buffer[..read]);
            let path = request
                .split_whitespace()
                .nth(1)
                .unwrap_or("/")
                .trim_start_matches('/');
            let file = base.join(path);
            let body = fs::read(file).unwrap_or_default();
            if body.is_empty() {
                let _ = stream.write_all(b"HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\n\r\n");
            } else {
                let _ = write!(
                    stream,
                    "HTTP/1.1 200 OK\r\nContent-Length: {}\r\n\r\n",
                    body.len()
                );
                let _ = stream.write_all(&body);
            }
        }
    });
    let cwd = project(temp.path());
    let output = run(
        &cwd,
        &[
            "add",
            "a",
            "--registry",
            &format!("http://127.0.0.1:{port}"),
        ],
    );
    assert!(output.status.success(), "{}", stderr(&output));
    assert!(cwd.join("src/components/a.tsx").exists());
}

#[test]
fn config_can_omit_registry_and_keep_root() {
    let temp = TempDir::new().unwrap();
    let reg = registry(
        temp.path(),
        r#"{"items":[{"name":"a","type":"registry:ui","files":[{"path":"components/a.tsx","type":"registry:ui"}]}]}"#,
        &[("components/a.tsx", "export const A = 1\n")],
    );
    let cwd = project(temp.path());
    write(&cwd.join("flint.json"), "{\"root\":\"app\"}\n");
    let output = run(&cwd, &["add", "a", "--registry", reg.to_str().unwrap()]);
    assert!(output.status.success(), "{}", stderr(&output));
    assert!(cwd.join("app/components/a.tsx").exists());
}

#[test]
fn rejects_a_dependency_cycle_before_writing() {
    let temp = TempDir::new().unwrap();
    let reg = registry(
        temp.path(),
        r#"{"items":[
          {"name":"a","type":"registry:ui","registryDependencies":["b"],"files":[{"path":"components/a.tsx","type":"registry:ui"}]},
          {"name":"b","type":"registry:ui","registryDependencies":["a"],"files":[{"path":"components/b.tsx","type":"registry:ui"}]}
        ]}"#,
        &[
            ("components/a.tsx", "export const A = 1\n"),
            ("components/b.tsx", "export const B = 1\n"),
        ],
    );
    let cwd = project(temp.path());
    let output = run(&cwd, &["add", "a", "--registry", reg.to_str().unwrap()]);
    assert!(!output.status.success());
    assert!(stderr(&output).contains("dependency cycle: a -> b -> a"));
    assert!(!cwd.join("src/components/a.tsx").exists());
}

#[test]
fn rejects_a_file_listed_by_two_items() {
    let temp = TempDir::new().unwrap();
    let reg = registry(
        temp.path(),
        r#"{"items":[
          {"name":"a","type":"registry:ui","files":[{"path":"components/shared.tsx","type":"registry:ui"}]},
          {"name":"b","type":"registry:ui","files":[{"path":"components/shared.tsx","type":"registry:ui"}]}
        ]}"#,
        &[("components/shared.tsx", "export const Shared = 1\n")],
    );
    let cwd = project(temp.path());
    let output = run(&cwd, &["add", "a", "--registry", reg.to_str().unwrap()]);
    assert!(!output.status.success());
    assert!(stderr(&output).contains("is listed more than once"));
}

#[test]
fn short_help_flag_prints_usage() {
    let temp = TempDir::new().unwrap();
    let cwd = project(temp.path());
    let output = run(&cwd, &["-h"]);
    assert!(output.status.success());
    assert!(stdout(&output).contains("flint-ui"));
    assert!(stdout(&output).contains("init"));
}

#[test]
fn version_reads_the_environment_override() {
    let temp = TempDir::new().unwrap();
    let cwd = project(temp.path());
    let output = Command::new(bin())
        .current_dir(&cwd)
        .arg("--version")
        .env("FLINT_VERSION", "v9.8.7")
        .output()
        .unwrap();
    assert!(output.status.success());
    assert_eq!(stdout(&output).trim(), "9.8.7");
}

#[test]
fn add_requires_a_component_name() {
    let temp = TempDir::new().unwrap();
    let cwd = project(temp.path());
    let output = run(&cwd, &["add"]);
    assert!(!output.status.success());
    assert!(stderr(&output).contains("Name at least one component"));
}

#[test]
fn diff_requires_a_component_name() {
    let temp = TempDir::new().unwrap();
    let cwd = project(temp.path());
    let output = run(&cwd, &["diff"]);
    assert!(!output.status.success());
    assert!(stderr(&output).contains("Name at least one component"));
}

#[test]
fn root_flag_needs_a_value() {
    let temp = TempDir::new().unwrap();
    let cwd = project(temp.path());
    let output = run(&cwd, &["add", "--root"]);
    assert!(!output.status.success());
    assert!(stderr(&output).contains("--root needs a directory"));
}

#[test]
fn registry_flag_needs_a_value() {
    let temp = TempDir::new().unwrap();
    let cwd = project(temp.path());
    let output = run(&cwd, &["add", "--registry"]);
    assert!(!output.status.success());
    assert!(stderr(&output).contains("--registry needs a path or URL"));
}

#[test]
fn unknown_command_is_rejected() {
    let temp = TempDir::new().unwrap();
    let cwd = project(temp.path());
    let output = run(&cwd, &["nope"]);
    assert!(!output.status.success());
    assert!(stderr(&output).contains("Unknown command \"nope\""));
}

#[test]
fn list_separates_components_and_shared_items() {
    let temp = TempDir::new().unwrap();
    let reg = registry(
        temp.path(),
        r#"{"items":[
          {"name":"widget","type":"registry:ui","description":"A widget","files":[{"path":"components/widget.tsx","type":"registry:ui"}]},
          {"name":"shared","type":"registry:lib","description":"Shared code","files":[{"path":"lib/shared.ts","type":"registry:lib"}]}
        ]}"#,
        &[
            ("components/widget.tsx", "export const Widget = 1\n"),
            ("lib/shared.ts", "export const shared = 1\n"),
        ],
    );
    let cwd = project(temp.path());
    let output = run(&cwd, &["list", "--registry", reg.to_str().unwrap()]);
    assert!(output.status.success(), "{}", stderr(&output));
    let text = stdout(&output);
    assert!(text.contains("components\n  widget"), "{text}");
    assert!(text.contains("shared\n  shared"), "{text}");
    assert!(text.contains("A widget"));
    assert!(text.contains("Shared code"));
}

#[test]
fn add_dry_run_writes_nothing() {
    let temp = TempDir::new().unwrap();
    let reg = registry(
        temp.path(),
        r#"{"items":[{"name":"widget","type":"registry:ui","files":[{"path":"components/widget.tsx","type":"registry:ui"}]}]}"#,
        &[("components/widget.tsx", "export const Widget = 1\n")],
    );
    let cwd = project(temp.path());
    let output = run(
        &cwd,
        &[
            "add",
            "widget",
            "--dry-run",
            "--registry",
            reg.to_str().unwrap(),
        ],
    );
    assert!(output.status.success(), "{}", stderr(&output));
    assert!(stdout(&output).contains("would add"));
    assert!(!cwd.join("src/components/widget.tsx").exists());
}

#[test]
fn existing_files_are_skipped_and_overwrite_replaces_them() {
    let temp = TempDir::new().unwrap();
    let reg = registry(
        temp.path(),
        r#"{"items":[{"name":"widget","type":"registry:ui","files":[{"path":"components/widget.tsx","type":"registry:ui"}]}]}"#,
        &[("components/widget.tsx", "registry version\n")],
    );
    let cwd = project(temp.path());
    assert!(
        run(
            &cwd,
            &["add", "widget", "--registry", reg.to_str().unwrap()]
        )
        .status
        .success()
    );
    let target = cwd.join("src/components/widget.tsx");
    fs::write(&target, "local version\n").unwrap();

    let skipped = run(
        &cwd,
        &["add", "widget", "--registry", reg.to_str().unwrap()],
    );
    assert!(skipped.status.success());
    assert!(stdout(&skipped).contains("skip"));
    assert_eq!(fs::read_to_string(&target).unwrap(), "local version\n");

    let replaced = run(
        &cwd,
        &[
            "add",
            "widget",
            "--overwrite",
            "--registry",
            reg.to_str().unwrap(),
        ],
    );
    assert!(replaced.status.success());
    assert_eq!(fs::read_to_string(&target).unwrap(), "registry version\n");
}

#[test]
fn repeating_a_name_copies_its_files_once() {
    let temp = TempDir::new().unwrap();
    let reg = registry(
        temp.path(),
        r#"{"items":[{"name":"widget","type":"registry:ui","files":[{"path":"components/widget.tsx","type":"registry:ui"}]}]}"#,
        &[("components/widget.tsx", "export const Widget = 1\n")],
    );
    let cwd = project(temp.path());
    let output = run(
        &cwd,
        &[
            "add",
            "widget",
            "widget",
            "--registry",
            reg.to_str().unwrap(),
        ],
    );
    assert!(output.status.success());
    assert_eq!(stdout(&output).matches("components/widget.tsx").count(), 1);
}

#[test]
fn diff_is_clean_after_add_and_reports_a_missing_file() {
    let temp = TempDir::new().unwrap();
    let reg = registry(
        temp.path(),
        r#"{"items":[{"name":"widget","type":"registry:ui","files":[{"path":"components/widget.tsx","type":"registry:ui"}]}]}"#,
        &[("components/widget.tsx", "export const Widget = 1\n")],
    );
    let cwd = project(temp.path());
    assert!(
        run(
            &cwd,
            &["add", "widget", "--registry", reg.to_str().unwrap()]
        )
        .status
        .success()
    );
    let clean = run(
        &cwd,
        &["diff", "widget", "--registry", reg.to_str().unwrap()],
    );
    assert!(clean.status.success());
    assert!(stdout(&clean).contains("0 changed, 0 missing"));

    fs::remove_file(cwd.join("src/components/widget.tsx")).unwrap();
    let missing = run(
        &cwd,
        &["diff", "widget", "--registry", reg.to_str().unwrap()],
    );
    assert_eq!(missing.status.code(), Some(1));
    assert!(stdout(&missing).contains("missing"));
    assert!(stdout(&missing).contains("0 changed, 1 missing"));
}

#[test]
fn rejects_duplicate_item_names() {
    let temp = TempDir::new().unwrap();
    let reg = registry(
        temp.path(),
        r#"{"items":[
          {"name":"a","type":"registry:ui","files":[{"path":"components/a.tsx","type":"registry:ui"}]},
          {"name":"a","type":"registry:ui","files":[{"path":"components/b.tsx","type":"registry:ui"}]}
        ]}"#,
        &[
            ("components/a.tsx", "export const A = 1\n"),
            ("components/b.tsx", "export const B = 1\n"),
        ],
    );
    let cwd = project(temp.path());
    let output = run(&cwd, &["add", "a", "--registry", reg.to_str().unwrap()]);
    assert!(!output.status.success());
    assert!(stderr(&output).contains("duplicate item \"a\""));
}

#[test]
fn rejects_missing_dependencies() {
    let temp = TempDir::new().unwrap();
    let reg = registry(
        temp.path(),
        r#"{"items":[{"name":"a","type":"registry:ui","registryDependencies":["nope"],"files":[{"path":"components/a.tsx","type":"registry:ui"}]}]}"#,
        &[("components/a.tsx", "export const A = 1\n")],
    );
    let cwd = project(temp.path());
    let output = run(&cwd, &["add", "a", "--registry", reg.to_str().unwrap()]);
    assert!(!output.status.success());
    assert!(stderr(&output).contains("depends on \"nope\""));
    assert!(!cwd.join("src/components/a.tsx").exists());
}

#[test]
fn rejects_invalid_json() {
    let temp = TempDir::new().unwrap();
    let reg = registry(temp.path(), "{ broken", &[]);
    let cwd = project(temp.path());
    let output = run(&cwd, &["list", "--registry", reg.to_str().unwrap()]);
    assert!(!output.status.success());
    assert!(stderr(&output).contains("registry.json is not JSON"));
}

#[test]
fn rejects_an_empty_items_array() {
    let temp = TempDir::new().unwrap();
    let reg = registry(temp.path(), r#"{"items":[]}"#, &[]);
    let cwd = project(temp.path());
    let output = run(&cwd, &["list", "--registry", reg.to_str().unwrap()]);
    assert!(!output.status.success());
    assert!(stderr(&output).contains("\"items\" must be a non-empty array"));
}

#[test]
fn rejects_an_unknown_component() {
    let temp = TempDir::new().unwrap();
    let reg = registry(
        temp.path(),
        r#"{"items":[{"name":"a","type":"registry:ui","files":[{"path":"components/a.tsx","type":"registry:ui"}]}]}"#,
        &[("components/a.tsx", "export const A = 1\n")],
    );
    let cwd = project(temp.path());
    let output = run(&cwd, &["add", "nope", "--registry", reg.to_str().unwrap()]);
    assert!(!output.status.success());
    assert!(stderr(&output).contains("Unknown component \"nope\""));
}

#[test]
fn config_root_is_used_and_the_flag_wins() {
    let temp = TempDir::new().unwrap();
    let reg = registry(
        temp.path(),
        r#"{"items":[{"name":"a","type":"registry:ui","files":[{"path":"components/a.tsx","type":"registry:ui"}]}]}"#,
        &[("components/a.tsx", "export const A = 1\n")],
    );
    let cwd = project(temp.path());
    write(
        &cwd.join("flint.json"),
        &format!(r#"{{"root":"app","registry":"{}"}}"#, reg.display()),
    );
    let configured = run(&cwd, &["add", "a"]);
    assert!(configured.status.success(), "{}", stderr(&configured));
    assert!(cwd.join("app/components/a.tsx").exists());

    let flagged = run(&cwd, &["add", "a", "--root", "flag"]);
    assert!(flagged.status.success(), "{}", stderr(&flagged));
    assert!(cwd.join("flag/components/a.tsx").exists());
    assert!(!cwd.join("configured/components/a.tsx").exists());
}

#[test]
fn rejects_a_non_string_root_in_config() {
    let temp = TempDir::new().unwrap();
    let cwd = project(temp.path());
    write(&cwd.join("flint.json"), r#"{"root":5}"#);
    let output = run(&cwd, &["list"]);
    assert!(!output.status.success());
    assert!(stderr(&output).contains("\"root\" must be a string"));
}

#[test]
fn rejects_a_config_that_is_not_an_object() {
    let temp = TempDir::new().unwrap();
    let cwd = project(temp.path());
    write(&cwd.join("flint.json"), "[]\n");
    let output = run(&cwd, &["list"]);
    assert!(!output.status.success());
    assert!(stderr(&output).contains("must contain a JSON object"));
}

#[test]
fn version_is_a_semantic_version() {
    let temp = TempDir::new().unwrap();
    let cwd = project(temp.path());
    let output = run(&cwd, &["--version"]);
    assert!(output.status.success());
    let version = stdout(&output);
    let version = version.trim();
    assert_eq!(version.split('.').count(), 3, "{version}");
    assert!(version.split('.').all(|part| part.parse::<u64>().is_ok()));
}

#[test]
fn registry_precedence_is_flag_then_environment_then_config() {
    let temp = TempDir::new().unwrap();
    let config = registry(
        &temp.path().join("config"),
        r#"{"items":[{"name":"widget","type":"registry:ui","files":[{"path":"components/widget.tsx","type":"registry:ui"}]}]}"#,
        &[("components/widget.tsx", "config\n")],
    );
    let environment = registry(
        &temp.path().join("environment"),
        r#"{"items":[{"name":"widget","type":"registry:ui","files":[{"path":"components/widget.tsx","type":"registry:ui"}]}]}"#,
        &[("components/widget.tsx", "environment\n")],
    );
    let flag = registry(
        &temp.path().join("flag"),
        r#"{"items":[{"name":"widget","type":"registry:ui","files":[{"path":"components/widget.tsx","type":"registry:ui"}]}]}"#,
        &[("components/widget.tsx", "flag\n")],
    );
    let cwd = project(temp.path());
    write(
        &cwd.join("flint.json"),
        &format!(r#"{{"root":"src","registry":"{}"}}"#, config.display()),
    );
    let output = cwd.join("src/components/widget.tsx");

    let by_flag = run_env(
        &cwd,
        &["add", "widget", "--registry", flag.to_str().unwrap()],
        &[("FLINT_REGISTRY", environment.to_str().unwrap())],
    );
    assert!(by_flag.status.success(), "{}", stderr(&by_flag));
    assert_eq!(fs::read_to_string(&output).unwrap(), "flag\n");

    let by_env = run_env(
        &cwd,
        &["add", "widget", "--overwrite"],
        &[("FLINT_REGISTRY", environment.to_str().unwrap())],
    );
    assert!(by_env.status.success(), "{}", stderr(&by_env));
    assert_eq!(fs::read_to_string(&output).unwrap(), "environment\n");

    let by_config = run(&cwd, &["add", "widget", "--overwrite"]);
    assert!(by_config.status.success(), "{}", stderr(&by_config));
    assert_eq!(fs::read_to_string(&output).unwrap(), "config\n");
}

#[test]
fn http_registry_trailing_slash_is_harmless() {
    let temp = TempDir::new().unwrap();
    let server = Http::new(&[
        (
            "ok/registry.json",
            r#"{"items":[{"name":"widget","type":"registry:ui","files":[{"path":"components/widget.tsx","type":"registry:ui"}]}]}"#,
        ),
        ("ok/components/widget.tsx", "export const Widget = 1\n"),
    ]);
    let cwd = project(temp.path());
    let output = run(
        &cwd,
        &[
            "add",
            "widget",
            "--registry",
            &format!("{}/ok/", server.base),
        ],
    );
    assert!(output.status.success(), "{}", stderr(&output));
    assert!(cwd.join("src/components/widget.tsx").exists());
}

#[test]
fn http_404_fails_before_writing_any_file() {
    let temp = TempDir::new().unwrap();
    let server = Http::new(&[
        (
            "missing/registry.json",
            r#"{"items":[{"name":"widget","type":"registry:ui","files":[{"path":"components/widget.tsx","type":"registry:ui"},{"path":"components/missing.tsx","type":"registry:ui"}]}]}"#,
        ),
        ("missing/components/widget.tsx", "export const Widget = 1\n"),
    ]);
    let cwd = project(temp.path());
    let output = run(
        &cwd,
        &[
            "add",
            "widget",
            "--registry",
            &format!("{}/missing", server.base),
        ],
    );
    assert_eq!(output.status.code(), Some(1));
    assert!(stderr(&output).contains("Could not download components/missing.tsx (404)"));
    assert!(!cwd.join("src/components/widget.tsx").exists());
    assert!(!cwd.join("src/components/missing.tsx").exists());
}

#[test]
fn http_invalid_json_is_reported() {
    let temp = TempDir::new().unwrap();
    let server = Http::new(&[("bad/registry.json", "{ not json")]);
    let cwd = project(temp.path());
    let output = run(
        &cwd,
        &["list", "--registry", &format!("{}/bad", server.base)],
    );
    assert!(!output.status.success());
    assert!(stderr(&output).contains("registry.json is not JSON"));
}

#[test]
fn flint_registry_is_used_without_a_flag_or_config() {
    let temp = TempDir::new().unwrap();
    let server = Http::new(&[
        (
            "ok/registry.json",
            r#"{"items":[{"name":"widget","type":"registry:ui","files":[{"path":"components/widget.tsx","type":"registry:ui"}]}]}"#,
        ),
        ("ok/components/widget.tsx", "export const Widget = 1\n"),
    ]);
    let cwd = project(temp.path());
    let output = run_env(
        &cwd,
        &["add", "widget"],
        &[("FLINT_REGISTRY", &format!("{}/ok", server.base))],
    );
    assert!(output.status.success(), "{}", stderr(&output));
    assert!(cwd.join("src/components/widget.tsx").exists());
}

#[test]
fn config_can_pin_a_remote_registry() {
    let temp = TempDir::new().unwrap();
    let server = Http::new(&[
        (
            "ok/registry.json",
            r#"{"items":[{"name":"widget","type":"registry:ui","files":[{"path":"components/widget.tsx","type":"registry:ui"}]}]}"#,
        ),
        ("ok/components/widget.tsx", "export const Widget = 1\n"),
    ]);
    let cwd = project(temp.path());
    write(
        &cwd.join("flint.json"),
        &format!(r#"{{"root":"src","registry":"{}/ok"}}"#, server.base),
    );
    let output = run(&cwd, &["add", "widget"]);
    assert!(output.status.success(), "{}", stderr(&output));
    assert!(cwd.join("src/components/widget.tsx").exists());
}

#[test]
fn init_copies_the_shared_layer_from_http() {
    let temp = TempDir::new().unwrap();
    let names = [
        "lib",
        "theme",
        "utils",
        "theme-provider",
        "text",
        "icon",
        "icons",
        "use-controllable",
        "fonts",
    ];
    let items = names
        .iter()
        .map(|name| {
            let dependencies = if *name == "lib" {
                format!(
                    r#","registryDependencies":[{}]"#,
                    names
                        .iter()
                        .filter(|entry| *entry != name)
                        .map(|entry| format!("\"{entry}\""))
                        .collect::<Vec<_>>()
                        .join(",")
                )
            } else {
                String::new()
            };
            format!(
                r#"{{"name":"{name}","type":"registry:lib"{dependencies},"files":[{{"path":"lib/{name}.ts","type":"registry:lib"}}]}}"#
            )
        })
        .collect::<Vec<_>>()
        .join(",");
    let manifest = format!(r#"{{"items":[{items}]}}"#);
    let mut files: Vec<(String, String)> = vec![("full/registry.json".into(), manifest)];
    for name in names {
        files.push((
            format!("full/lib/{name}.ts"),
            format!("export const {name} = 1\n"),
        ));
    }
    let borrowed: Vec<(&str, &str)> = files
        .iter()
        .map(|(path, body)| (path.as_str(), body.as_str()))
        .collect();
    let server = Http::new(&borrowed);
    let cwd = project(temp.path());
    let output = run(
        &cwd,
        &["init", "--registry", &format!("{}/full", server.base)],
    );
    assert!(output.status.success(), "{}", stderr(&output));
    assert!(cwd.join("flint.json").exists());
    for name in names {
        assert!(cwd.join(format!("src/lib/{name}.ts")).exists(), "{name}");
    }
}
