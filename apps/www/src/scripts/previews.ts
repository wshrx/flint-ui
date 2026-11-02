/**
 * Interaction for the static specimens.
 *
 * The previews are HTML and CSS, not the native renderer. This script adds the
 * small amount of behaviour a reader expects from a demo: switches, tabs,
 * selects, dialogs, the context menu, a filterable combobox, a progress slider
 * and a drop target. It delegates from the document, so it runs once per page.
 */

type El = HTMLElement

function previewRoot(element: Element): El | null {
  return element.closest<El>(".flint-preview-canvas")
}

function setMenu(menu: El, open: boolean) {
  menu.dataset.open = String(open)
  const trigger = menu.parentElement?.querySelector<El>(
    "[data-pv-select-trigger], [data-pv-combobox-trigger]"
  )
  trigger?.setAttribute("aria-expanded", String(open))
}

function closeMenus(except?: El | null) {
  for (const menu of document.querySelectorAll<El>("[data-pv-menu][data-open='true']")) {
    if (except && menu === except) continue
    setMenu(menu, false)
  }
}

function showStatus(root: El | null, message: string) {
  const output = root?.querySelector<El>("[data-pv-status]")
  if (!output) return
  output.textContent = message
  window.setTimeout(() => {
    if (output.textContent === message) output.textContent = ""
  }, 1600)
}

document.addEventListener("click", (event) => {
  const target = event.target
  if (!(target instanceof Element)) return

  const toast = target.closest<El>("[data-pv-toast]")
  if (toast) showStatus(previewRoot(toast), toast.dataset.pvToast ?? "Done")

  const switchButton = target.closest<El>("[data-pv-switch]")
  if (switchButton) {
    const on = switchButton.getAttribute("aria-checked") !== "true"
    switchButton.setAttribute("aria-checked", String(on))
    switchButton.classList.toggle("ui-switch-on", on)
    return
  }

  const checkButton = target.closest<El>("[data-pv-check]")
  if (checkButton) {
    const on = checkButton.getAttribute("aria-checked") === "true"
    checkButton.setAttribute("aria-checked", String(!on))
    return
  }

  const tab = target.closest<El>("[data-pv-tab]")
  if (tab) {
    const wrap = tab.closest<El>("[data-pv-tabs]")
    if (wrap) {
      for (const item of wrap.querySelectorAll<El>("[data-pv-tab]")) {
        const active = item === tab
        item.classList.toggle("ui-tab-active", active)
        item.setAttribute("aria-selected", String(active))
      }
      for (const panel of wrap.querySelectorAll<El>("[data-pv-panel]")) {
        panel.hidden = panel.dataset.pvPanel !== tab.dataset.target
      }
    }
    return
  }

  const trigger = target.closest<El>("[data-pv-select-trigger], [data-pv-combobox-trigger]")
  if (trigger) {
    const menu = trigger.parentElement?.querySelector<El>("[data-pv-menu]")
    if (menu) setMenu(menu, menu.dataset.open !== "true")
    return
  }

  const option = target.closest<El>("[data-pv-option]")
  if (option) {
    const menu = option.closest<El>("[data-pv-menu]")
    if (menu) {
      const trigger = menu.parentElement?.querySelector<El>(
        "[data-pv-select-trigger], [data-pv-combobox-trigger]"
      )
      const value = trigger?.querySelector<El>("[data-pv-value]")
      if (value) value.textContent = option.dataset.value ?? option.textContent?.trim() ?? ""
      for (const item of menu.querySelectorAll<El>("[data-pv-option]")) {
        item.classList.toggle("pv-menu-active", item === option)
      }
      setMenu(menu, false)
    }
    return
  }

  const openDialog = target.closest<El>("[data-pv-open-dialog]")
  if (openDialog) {
    const dialog = openDialog.parentElement?.querySelector<El>("[data-pv-dialog]")
    if (dialog) dialog.dataset.open = "true"
    return
  }

  const closeDialog = target.closest<El>("[data-pv-close-dialog]")
  if (closeDialog) {
    const dialog = closeDialog.closest<El>("[data-pv-dialog]")
    if (dialog) dialog.dataset.open = "false"
    return
  }

  const dismiss = target.closest<El>("[data-pv-dismiss]")
  if (dismiss) {
    const alert = dismiss.closest<El>("[data-pv-alert]")
    if (alert) alert.hidden = true
    return
  }

  if (
    !target.closest("[data-pv-menu]") &&
    !target.closest("[data-pv-select-trigger]") &&
    !target.closest("[data-pv-combobox-trigger]") &&
    !target.closest("[data-pv-context]")
  ) {
    closeMenus()
  }
})

document.addEventListener("input", (event) => {
  const input = event.target
  if (!(input instanceof HTMLInputElement)) return

  if (input.matches("[data-pv-combobox-input]")) {
    const wrap = input.closest<El>("[data-pv-combobox]")
    const query = input.value.trim().toLowerCase()
    for (const option of wrap?.querySelectorAll<El>("[data-pv-option]") ?? []) {
      option.hidden = Boolean(query) && !option.textContent?.toLowerCase().includes(query)
    }
    const menu = wrap?.querySelector<El>("[data-pv-menu]")
    if (menu) setMenu(menu, true)
  }

  if (input.matches("[data-pv-range]")) {
    const wrap = input.closest<El>("[data-pv-progress]")
    const bar = wrap?.querySelector<El>(".ui-progress span")
    const label = wrap?.querySelector<El>("[data-pv-progress-value]")
    if (bar) bar.style.width = `${input.value}%`
    if (label) label.textContent = `${input.value}%`
  }
})

document.addEventListener("contextmenu", (event) => {
  const target = event.target
  if (!(target instanceof Element)) return
  const area = target.closest<El>("[data-pv-context]")
  if (!area) return
  event.preventDefault()
  const menu = area.parentElement?.querySelector<El>("[data-pv-menu]")
  if (menu) setMenu(menu, true)
})

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return
  closeMenus()
  for (const dialog of document.querySelectorAll<El>("[data-pv-dialog][data-open='true']")) {
    dialog.dataset.open = "false"
  }
})

document.addEventListener("dragover", (event) => {
  const target = event.target
  if (!(target instanceof Element)) return
  const zone = target.closest<El>("[data-pv-dropzone]")
  if (!zone) return
  event.preventDefault()
  zone.classList.add("pv-drop-active")
})

document.addEventListener("dragleave", (event) => {
  const target = event.target
  if (!(target instanceof Element)) return
  const zone = target.closest<El>("[data-pv-dropzone]")
  if (zone && !zone.contains(event.relatedTarget as Node | null)) zone.classList.remove("pv-drop-active")
})

document.addEventListener("drop", (event) => {
  const target = event.target
  if (!(target instanceof Element)) return
  const zone = target.closest<El>("[data-pv-dropzone]")
  if (!zone) return
  event.preventDefault()
  zone.classList.remove("pv-drop-active")
  const files = (event as DragEvent).dataTransfer?.files
  const output = zone.querySelector<El>("[data-pv-files]")
  if (output) {
    output.textContent = files?.length ? [...files].map((file) => file.name).join(", ") : ""
  }
})

document.addEventListener("change", (event) => {
  const input = event.target
  if (!(input instanceof HTMLInputElement) || !input.matches("[data-pv-file]")) return
  const zone = input.closest<El>("[data-pv-dropzone]")
  const output = zone?.querySelector<El>("[data-pv-files]")
  if (output) output.textContent = [...(input.files ?? [])].map((file) => file.name).join(", ")
})
