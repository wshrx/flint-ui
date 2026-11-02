#!/usr/bin/env rust
//! flint-ui: add flint components to a GPUIX app.
//!
//! This is the Rust port of the original TypeScript CLI. It copies source
//! files; it never compiles or runs the UI. The registry is the contract.

use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::env;
use std::fs;
use std::io::Read;
use std::path::{Component, Path, PathBuf};
use std::process;
use std::time::Duration;

const REGISTRY_BASE: &str = "https://raw.githubusercontent.com/wshrx/flint-ui";
const DEFAULT_REGISTRY: &str = "https://raw.githubusercontent.com/wshrx/flint-ui/main/registry";
const CONFIG: &str = "flint.json";
const FETCH_TIMEOUT: Duration = Duration::from_secs(30);
const HEAD_TIMEOUT: Duration = Duration::from_secs(10);

#[derive(Debug, Deserialize, Clone)]
struct Registry {
    items: Vec<Item>,
}

#[derive(Debug, Deserialize, Clone)]
struct Item {
    name: String,
    #[serde(rename = "type")]
    kind: String,
    #[serde(default)]
    description: Option<String>,
    #[serde(rename = "registryDependencies", default)]
    registry_dependencies: Vec<String>,
    files: Vec<FileEntry>,
}

#[derive(Debug, Deserialize, Clone)]
struct FileEntry {
    path: String,
}

#[derive(Debug, Deserialize, Serialize)]
struct Config {
    #[serde(rename = "$schema", skip_serializing_if = "Option::is_none")]
    schema: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    root: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    registry: Option<String>,
}

struct Args {
    command: Option<String>,
    names: Vec<String>,
    flags: HashSet<String>,
    root: Option<String>,
    registry: Option<String>,
}

fn fail(message: &str) -> ! {
    eprintln!("\n{message}\n");
    process::exit(1);
}

/// The release build bakes the version in with `FLINT_VERSION`; a plain
/// `cargo build` falls back to Cargo's package version. The environment
/// override exists so the install script can pin a release and `--version`
/// still reports what it installed.
fn version() -> String {
    env::var("FLINT_VERSION")
        .ok()
        .filter(|value| !value.is_empty())
        .map(|value| value.trim_start_matches('v').to_string())
        .or_else(|| option_env!("FLINT_VERSION").map(str::to_string))
        .unwrap_or_else(|| env!("CARGO_PKG_VERSION").to_string())
}

fn parse_args(argv: Vec<String>) -> Args {
    let mut command = None;
    let mut names = Vec::new();
    let mut flags = HashSet::new();
    let mut root = None;
    let mut registry = None;
    let mut index = 0;

    if let Some(first) = argv.first() {
        command = Some(first.clone());
        index = 1;
    }

    while index < argv.len() {
        let arg = &argv[index];
        if arg == "--root" {
            index += 1;
            let value = argv
                .get(index)
                .unwrap_or_else(|| fail("--root needs a directory"));
            root = Some(value.clone());
        } else if let Some(value) = arg.strip_prefix("--root=") {
            root = Some(value.to_string());
        } else if arg == "--registry" {
            index += 1;
            let value = argv
                .get(index)
                .unwrap_or_else(|| fail("--registry needs a path or URL"));
            registry = Some(value.clone());
        } else if let Some(value) = arg.strip_prefix("--registry=") {
            registry = Some(value.to_string());
        } else if arg == "--dry-run" || arg == "--overwrite" || arg == "--help" {
            flags.insert(arg.clone());
        } else if arg.starts_with("--") {
            fail(&format!("Unknown flag \"{arg}\". Try flint-ui help."));
        } else {
            names.push(arg.clone());
        }
        index += 1;
    }

    Args {
        command,
        names,
        flags,
        root,
        registry,
    }
}

fn is_url(source: &str) -> bool {
    source.starts_with("http://") || source.starts_with("https://")
}

fn agent(timeout: Duration) -> ureq::Agent {
    ureq::AgentBuilder::new().timeout(timeout).build()
}

fn read_source(source: &str, path: &str) -> Result<Vec<u8>, String> {
    if is_url(source) {
        let url = format!("{}/{}", source.trim_end_matches('/'), path);
        let response = agent(FETCH_TIMEOUT)
            .get(&url)
            .call()
            .map_err(|error| match error {
                ureq::Error::Status(code, _) => format!("Could not download {path} ({code})"),
                other => format!("Could not download {path}: {other}"),
            })?;
        let mut bytes = Vec::new();
        response
            .into_reader()
            .read_to_end(&mut bytes)
            .map_err(|error| format!("Could not read {path}: {error}"))?;
        Ok(bytes)
    } else {
        let full = Path::new(source).join(path);
        fs::read(&full).map_err(|_| format!("Missing registry file: {}", full.display()))
    }
}

/// A registry path is relative to the registry root. Absolute paths, drive
/// prefixes and `..` segments would let a registry write outside the project.
fn escapes(path: &str) -> bool {
    let candidate = Path::new(path);
    if candidate.is_absolute() || path.starts_with('\\') {
        return true;
    }
    if path.as_bytes().get(1) == Some(&b':') {
        return true;
    }
    if candidate.components().any(|part| {
        matches!(
            part,
            Component::ParentDir | Component::Prefix(_) | Component::RootDir
        )
    }) {
        return true;
    }
    path.split(['/', '\\']).any(|part| part == "..")
}

fn validate_registry(data: &[u8]) -> Result<Registry, String> {
    let registry: Registry = serde_json::from_slice(data)
        .map_err(|error| format!("Invalid registry: registry.json is not JSON ({error})"))?;
    if registry.items.is_empty() {
        return Err("Invalid registry: \"items\" must be a non-empty array".into());
    }

    let mut names = HashSet::new();
    let mut paths = HashSet::new();
    for item in &registry.items {
        if item.name.is_empty() {
            return Err("Invalid registry: an item needs a name".into());
        }
        if !names.insert(item.name.clone()) {
            return Err(format!(
                "Invalid registry: duplicate item \"{}\"",
                item.name
            ));
        }
        if item.kind.is_empty() {
            return Err(format!("Invalid registry: \"{}\" needs a type", item.name));
        }
        if item.files.is_empty() {
            return Err(format!(
                "Invalid registry: \"{}\" needs at least one file",
                item.name
            ));
        }
        for file in &item.files {
            if file.path.is_empty() {
                return Err(format!(
                    "Invalid registry: \"{}\" has a file without a path",
                    item.name
                ));
            }
            if escapes(&file.path) {
                return Err(format!(
                    "Invalid registry: \"{}\" has a file path that escapes the registry: {}",
                    item.name, file.path
                ));
            }
            if !paths.insert(file.path.clone()) {
                return Err(format!(
                    "Invalid registry: file \"{}\" is listed more than once",
                    file.path
                ));
            }
        }
    }

    for item in &registry.items {
        for dependency in &item.registry_dependencies {
            if !names.contains(dependency) {
                return Err(format!(
                    "Invalid registry: \"{}\" depends on \"{}\", which is not in the registry",
                    item.name, dependency
                ));
            }
        }
    }

    // A cycle would still copy, but the order would be arbitrary and the
    // registry is supposed to be a DAG. Reject it the way the registry check
    // does, so both tools agree before a release.
    fn visit<'a>(
        name: &'a str,
        by_name: &HashMap<&'a str, &'a Item>,
        state: &mut HashMap<&'a str, u8>,
        stack: &mut Vec<&'a str>,
    ) -> Result<(), String> {
        match state.get(name).copied() {
            Some(2) => return Ok(()),
            Some(1) => {
                let start = stack.iter().position(|entry| *entry == name).unwrap_or(0);
                let mut cycle = stack[start..].to_vec();
                cycle.push(name);
                return Err(format!(
                    "Invalid registry: dependency cycle: {}",
                    cycle.join(" -> ")
                ));
            }
            _ => {}
        }
        state.insert(name, 1);
        stack.push(name);
        for dependency in &by_name[name].registry_dependencies {
            visit(dependency, by_name, state, stack)?;
        }
        stack.pop();
        state.insert(name, 2);
        Ok(())
    }

    let by_name: HashMap<&str, &Item> = registry
        .items
        .iter()
        .map(|item| (item.name.as_str(), item))
        .collect();
    let mut state = HashMap::new();
    let mut stack = Vec::new();
    for item in &registry.items {
        visit(&item.name, &by_name, &mut state, &mut stack)?;
    }

    Ok(registry)
}

fn load_registry(source: &str) -> Result<Registry, String> {
    let bytes = read_source(source, "registry.json")?;
    validate_registry(&bytes)
}

fn collect(items: &[Item], names: &[String]) -> Result<Vec<Item>, String> {
    let by_name: HashMap<&str, &Item> = items
        .iter()
        .map(|item| (item.name.as_str(), item))
        .collect();
    let mut seen = HashSet::new();
    let mut picked = Vec::new();

    fn visit(
        name: &str,
        by_name: &HashMap<&str, &Item>,
        seen: &mut HashSet<String>,
        picked: &mut Vec<Item>,
    ) -> Result<(), String> {
        if seen.contains(name) {
            return Ok(());
        }
        let item = by_name.get(name).ok_or_else(|| {
            format!("Unknown component \"{name}\". Run flint-ui list to see what exists.")
        })?;
        seen.insert(name.to_string());
        for dependency in &item.registry_dependencies {
            visit(dependency, by_name, seen, picked)?;
        }
        picked.push((*item).clone());
        Ok(())
    }

    for name in names {
        visit(name, &by_name, &mut seen, &mut picked)?;
    }
    Ok(picked)
}

struct Pending {
    path: String,
    target: PathBuf,
    bytes: Vec<u8>,
}

fn root_path(root: &str) -> PathBuf {
    let path = Path::new(root);
    if path.is_absolute() {
        path.to_path_buf()
    } else {
        env::current_dir()
            .unwrap_or_else(|_| PathBuf::from("."))
            .join(path)
    }
}

fn plan(
    source: &str,
    root: &str,
    items: &[Item],
    overwrite: bool,
) -> Result<(Vec<Pending>, Vec<String>), String> {
    let base = root_path(root);
    let mut pending = Vec::new();
    let mut skipped = Vec::new();

    for item in items {
        for file in &item.files {
            let target = base.join(&file.path);
            if target.exists() && !overwrite {
                skipped.push(file.path.clone());
                continue;
            }
            let bytes = read_source(source, &file.path)?;
            pending.push(Pending {
                path: file.path.clone(),
                target,
                bytes,
            });
        }
    }

    Ok((pending, skipped))
}

fn apply(
    pending: &[Pending],
    dry_run: bool,
    before: Option<&mut dyn FnMut() -> Result<(), String>>,
) -> Result<(), String> {
    if !dry_run {
        if let Some(callback) = before {
            callback()?;
        }
        for entry in pending {
            if let Some(parent) = entry.target.parent() {
                fs::create_dir_all(parent)
                    .map_err(|error| format!("Could not create {}: {error}", parent.display()))?;
            }
            fs::write(&entry.target, &entry.bytes)
                .map_err(|error| format!("Could not write {}: {error}", entry.target.display()))?;
        }
    }
    Ok(())
}

fn print_plan(pending: &[Pending], skipped: &[String], dry_run: bool) {
    for path in skipped {
        if dry_run {
            println!("  would skip  {path}");
        } else {
            println!("  skip  {path}");
        }
    }
    for entry in pending {
        if dry_run {
            println!("  would add   {}", entry.path);
        } else {
            println!("  add   {}", entry.path);
        }
    }
}

fn read_config() -> Result<Option<Config>, String> {
    let path = env::current_dir()
        .unwrap_or_else(|_| PathBuf::from("."))
        .join(CONFIG);
    if !path.exists() {
        return Ok(None);
    }
    let raw = fs::read_to_string(&path).map_err(|error| format!("{CONFIG}: {error}"))?;
    let parsed: serde_json::Value = serde_json::from_str(&raw)
        .map_err(|error| format!("{CONFIG} is not valid JSON: {error}"))?;
    let object = parsed
        .as_object()
        .ok_or_else(|| format!("{CONFIG} must contain a JSON object"))?;
    if let Some(root) = object.get("root") {
        if !root.is_string() {
            return Err(format!("{CONFIG}: \"root\" must be a string"));
        }
    }
    if let Some(registry) = object.get("registry") {
        if !registry.is_string() {
            return Err(format!("{CONFIG}: \"registry\" must be a string"));
        }
    }
    serde_json::from_value(parsed)
        .map(Some)
        .map_err(|error| format!("{CONFIG}: {error}"))
}

fn resolve_registry(flag: Option<&str>, config: Option<&Config>) -> String {
    let chosen = flag
        .map(str::to_string)
        .or_else(|| env::var("FLINT_REGISTRY").ok())
        .or_else(|| config.and_then(|config| config.registry.clone()))
        .unwrap_or_else(|| DEFAULT_REGISTRY.to_string());
    if is_url(&chosen) {
        chosen.trim_end_matches('/').to_string()
    } else {
        let path = Path::new(&chosen);
        if path.is_absolute() {
            chosen
        } else {
            env::current_dir()
                .unwrap_or_else(|_| PathBuf::from("."))
                .join(path)
                .to_string_lossy()
                .to_string()
        }
    }
}

fn pinned_registry(version: &str) -> String {
    let parts: Vec<&str> = version.split('.').collect();
    if parts.len() != 3 || parts.iter().any(|part| part.parse::<u64>().is_err()) {
        return DEFAULT_REGISTRY.to_string();
    }
    let pinned = format!("{REGISTRY_BASE}/v{version}/registry");
    if agent(HEAD_TIMEOUT)
        .head(&format!("{pinned}/registry.json"))
        .call()
        .is_ok()
    {
        pinned
    } else {
        DEFAULT_REGISTRY.to_string()
    }
}

fn init(args: &Args) {
    let config = read_config().unwrap_or_else(|error| fail(&error));
    let root = args
        .root
        .clone()
        .or_else(|| config.as_ref().and_then(|config| config.root.clone()))
        .unwrap_or_else(|| "src".to_string());
    let explicit = args
        .registry
        .clone()
        .or_else(|| env::var("FLINT_REGISTRY").ok())
        .or_else(|| config.as_ref().and_then(|config| config.registry.clone()));
    let registry = if explicit.is_some() {
        resolve_registry(args.registry.as_deref(), config.as_ref())
    } else {
        pinned_registry(&version())
    };
    let data = load_registry(&registry).unwrap_or_else(|error| fail(&error));
    let items = collect(&data.items, &["lib".to_string()]).unwrap_or_else(|error| fail(&error));
    let dry_run = args.flags.contains("--dry-run");
    let overwrite = args.flags.contains("--overwrite");
    let (pending, skipped) =
        plan(&registry, &root, &items, overwrite).unwrap_or_else(|error| fail(&error));
    let next = Config {
        schema: Some("https://wshrx.github.io/flint-ui/schema/flint.json".to_string()),
        root: Some(root.clone()),
        registry: Some(registry.clone()),
    };

    if dry_run {
        println!("\nflint  would write {CONFIG}  root={root}");
        apply(&pending, true, None).unwrap_or_else(|error| fail(&error));
    } else {
        apply(
            &pending,
            false,
            Some(&mut || {
                let raw = serde_json::to_string_pretty(&next).unwrap_or_default();
                fs::write(CONFIG, format!("{raw}\n"))
                    .map_err(|error| format!("{CONFIG}: {error}"))?;
                println!("\nflint  wrote {CONFIG}  root={root}");
                Ok(())
            }),
        )
        .unwrap_or_else(|error| fail(&error));
    }

    print_plan(&pending, &skipped, dry_run);
    println!(
        "\n{} file(s) {}, {} skipped\n",
        pending.len(),
        if dry_run { "would be added" } else { "added" },
        skipped.len()
    );
    println!("Next:");
    println!(
        "  1. tsconfig.json → \"jsxImportSource\": \"@gpuix/react\" and paths: {{ \"@/*\": [\"./{root}/*\"] }}"
    );
    println!("  2. wrap the app in <ThemeProvider>");
    println!("  3. flint-ui add button dialog select");
    println!();
}

fn add(args: &Args) {
    let config = read_config().unwrap_or_else(|error| fail(&error));
    let root = args
        .root
        .clone()
        .or_else(|| config.as_ref().and_then(|config| config.root.clone()))
        .unwrap_or_else(|| "src".to_string());
    let registry = resolve_registry(args.registry.as_deref(), config.as_ref());
    if args.names.is_empty() {
        fail("Name at least one component: flint-ui add button");
    }
    let data = load_registry(&registry).unwrap_or_else(|error| fail(&error));
    let items = collect(&data.items, &args.names).unwrap_or_else(|error| fail(&error));
    let dry_run = args.flags.contains("--dry-run");
    let overwrite = args.flags.contains("--overwrite");
    let (pending, skipped) =
        plan(&registry, &root, &items, overwrite).unwrap_or_else(|error| fail(&error));
    apply(&pending, dry_run, None).unwrap_or_else(|error| fail(&error));
    print_plan(&pending, &skipped, dry_run);
    println!(
        "\n{} file(s) {}, {} skipped",
        pending.len(),
        if dry_run { "would be added" } else { "added" },
        skipped.len()
    );
    if !skipped.is_empty() {
        println!("Files that already exist were left alone. Use --overwrite to replace them.");
    }
    println!();
}

fn list(args: &Args) {
    let config = read_config().unwrap_or_else(|error| fail(&error));
    let registry = resolve_registry(args.registry.as_deref(), config.as_ref());
    let data = load_registry(&registry).unwrap_or_else(|error| fail(&error));
    println!("\ncomponents");
    for item in data.items.iter().filter(|item| item.kind == "registry:ui") {
        println!(
            "  {:<12} {}",
            item.name,
            item.description.as_deref().unwrap_or("")
        );
    }
    println!("\nshared");
    for item in data.items.iter().filter(|item| item.kind != "registry:ui") {
        println!(
            "  {:<12} {}",
            item.name,
            item.description.as_deref().unwrap_or("")
        );
    }
    println!();
}

fn line_count(text: &[u8]) -> usize {
    if text.is_empty() {
        return 0;
    }
    let lines = text.split(|byte| *byte == b'\n').count();
    if text.last() == Some(&b'\n') {
        lines - 1
    } else {
        lines
    }
}

fn diff(args: &Args) {
    let config = read_config().unwrap_or_else(|error| fail(&error));
    let root = args
        .root
        .clone()
        .or_else(|| config.as_ref().and_then(|config| config.root.clone()))
        .unwrap_or_else(|| "src".to_string());
    let registry = resolve_registry(args.registry.as_deref(), config.as_ref());
    if args.names.is_empty() {
        fail("Name at least one component: flint-ui diff button");
    }
    let data = load_registry(&registry).unwrap_or_else(|error| fail(&error));
    let items = collect(&data.items, &args.names).unwrap_or_else(|error| fail(&error));
    let base = root_path(&root);
    let mut changed = 0;
    let mut missing = 0;
    let mut unchanged = 0;

    for item in &items {
        for file in &item.files {
            let target = base.join(&file.path);
            let remote = read_source(&registry, &file.path).unwrap_or_else(|error| fail(&error));
            if !target.exists() {
                println!("  missing  {}", file.path);
                missing += 1;
                continue;
            }
            let local = fs::read(&target).unwrap_or_else(|error| fail(&error.to_string()));
            if local == remote {
                unchanged += 1;
            } else {
                changed += 1;
                println!(
                    "  changed  {} ({} → {} lines)",
                    file.path,
                    line_count(&local),
                    line_count(&remote)
                );
            }
        }
    }

    println!("\n{changed} changed, {missing} missing, {unchanged} unchanged");
    if changed + missing > 0 {
        process::exit(1);
    }
}

fn help() {
    println!(
        "\nflint-ui — UI for GPUIX

  init                 write flint.json and copy the shared files
  add <component...>   copy components and their dependencies
  list                 list the registry
  diff <component...>   compare local files with the registry
  --version            print the CLI version

  --root <dir>          where the files go (default: src)
  --registry <path|url>  registry location
  --overwrite           replace existing files
  --dry-run             print what would be written, write nothing
"
    );
}

fn main() {
    #[cfg(unix)]
    unsafe {
        // Rust ignores SIGPIPE by default, which turns `flint-ui list | head`
        // into a panic on the closed pipe. A CLI should exit quietly instead.
        libc::signal(libc::SIGPIPE, libc::SIG_DFL);
    }
    let args = parse_args(env::args().skip(1).collect());
    if args.flags.contains("--help") {
        help();
        return;
    }
    match args.command.as_deref() {
        Some("--version") | Some("-v") | Some("version") => println!("{}", version()),
        Some("-h") => help(),
        Some("init") => init(&args),
        Some("add") => add(&args),
        Some("list") | Some("ls") => list(&args),
        Some("diff") => diff(&args),
        None | Some("help") | Some("--help") => help(),
        Some(command) => fail(&format!(
            "Unknown command \"{command}\". Try flint-ui help."
        )),
    }
}
