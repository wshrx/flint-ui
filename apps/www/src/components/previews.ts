/**
 * Interactive specimens for the landing gallery and every component page.
 *
 * These are HTML and CSS, not the native renderer. The stateful ones use real
 * inputs, buttons, details and a small delegated script, so a reader can type,
 * toggle, open, close, filter and drag before copying a file. The native
 * components remain the source of truth.
 */
export const PREVIEWS = {
  accordion: `
    <div class="pv-accordion">
      <details class="pv-accordion-item" open>
        <summary class="pv-accordion-head"><span>Profile</span><span class="pv-chevron">⌄</span></summary>
        <div class="pv-accordion-body">Name, photo and the address people see.</div>
      </details>
      <details class="pv-accordion-item">
        <summary class="pv-accordion-head"><span>Billing</span><span class="pv-chevron">⌄</span></summary>
        <div class="pv-accordion-body">Plan, invoices and the card on file.</div>
      </details>
    </div>`,
  alert: `
    <div class="pv-stack" data-pv-alerts>
      <div class="ui-alert pv-alert" data-pv-alert>
        <div><strong>Saved.</strong><span>Your changes are already live.</span></div>
        <button type="button" class="pv-dismiss" data-pv-dismiss aria-label="Dismiss">×</button>
      </div>
      <div class="ui-alert pv-alert pv-alert-danger" data-pv-alert>
        <div><strong>Deploy failed.</strong><span>The build stopped at typecheck.</span></div>
        <button type="button" class="pv-dismiss" data-pv-dismiss aria-label="Dismiss">×</button>
      </div>
    </div>`,
  avatar: `
    <div class="pv-row pv-gap-lg">
      <span class="pv-avatar">AL</span>
      <span class="pv-avatar pv-avatar-alt">MK</span>
      <span class="pv-avatar pv-avatar-photo">JD</span>
    </div>`,
  badge: `
    <div class="pv-row pv-wrap">
      <span class="pv-badge pv-badge-primary">Default</span>
      <span class="ui-badge"><span class="ui-dot"></span>Active</span>
      <span class="pv-badge pv-badge-outline">Outline</span>
      <span class="pv-badge pv-badge-danger">Failed</span>
    </div>`,
  button: `
    <div class="pv-stack">
      <div class="pv-row pv-wrap">
        <button type="button" class="ui-btn ui-btn-primary" data-pv-toast="Saved">Save changes</button>
        <button type="button" class="ui-btn ui-btn-secondary" data-pv-toast="Cancelled">Cancel</button>
        <button type="button" class="ui-btn ui-btn-outline" data-pv-toast="Export queued">Export</button>
        <button type="button" class="ui-btn ui-btn-ghost" data-pv-toast="Ghost">Ghost</button>
        <button type="button" class="ui-btn ui-btn-destructive" data-pv-toast="Deleted">Delete</button>
      </div>
      <span class="pv-status" data-pv-status></span>
    </div>`,
  card: `
    <div class="ui-card pv-card">
      <div class="ui-card-head">
        <span class="ui-card-title">Team plan</span>
        <span class="ui-badge"><span class="ui-dot"></span>Active</span>
      </div>
      <p class="ui-card-desc">Unlimited members, shared themes, and a private registry.</p>
      <div class="ui-progress"><span style="width: 64%"></span></div>
      <div class="ui-card-foot">
        <span class="ui-muted">64% of seats</span>
        <button type="button" class="ui-btn ui-btn-outline ui-btn-sm" data-pv-toast="Manage plan">Manage</button>
      </div>
      <span class="pv-status" data-pv-status></span>
    </div>`,
  checkbox: `
    <div class="pv-stack">
      <button type="button" class="ui-check pv-check" role="checkbox" aria-checked="true" data-pv-check>
        <span class="ui-check-box" aria-hidden="true">✓</span>
        <span>Email me when a member joins</span>
      </button>
      <button type="button" class="ui-check pv-check" role="checkbox" aria-checked="false" data-pv-check>
        <span class="ui-check-box" aria-hidden="true">✓</span>
        <span>Weekly summary</span>
      </button>
    </div>`,
  combobox: `
    <div class="pv-combobox" data-pv-combobox>
      <div class="ui-input pv-input-icon">
        <input class="pv-inline-input" data-pv-combobox-input value="Design" aria-label="Search roles" />
        <span class="pv-chevron">⌄</span>
      </div>
      <div class="pv-menu pv-menu-inline" data-pv-menu data-open="true">
        <button type="button" class="pv-menu-item pv-menu-active" data-pv-option data-value="Design">Design</button>
        <button type="button" class="pv-menu-item" data-pv-option data-value="Engineering">Engineering</button>
        <button type="button" class="pv-menu-item" data-pv-option data-value="Marketing">Marketing</button>
      </div>
    </div>`,
  "context-menu": `
    <div class="pv-stack">
      <div class="pv-context" data-pv-context tabindex="0">Right-click this row</div>
      <div class="pv-menu" data-pv-menu data-open="true">
        <button type="button" class="pv-menu-item" data-pv-toast="Renamed">Rename</button>
        <button type="button" class="pv-menu-item" data-pv-toast="Duplicated">Duplicate</button>
        <button type="button" class="pv-menu-item pv-menu-danger" data-pv-toast="Deleted">Delete</button>
      </div>
      <span class="pv-status" data-pv-status></span>
    </div>`,
  dialog: `
    <div class="pv-stack">
      <button type="button" class="ui-btn ui-btn-outline ui-btn-sm" data-pv-open-dialog>Open dialog</button>
      <div class="pv-dialog" data-pv-dialog data-open="true">
        <div class="pv-dialog-head">Invite a member <button type="button" class="pv-close" data-pv-close-dialog aria-label="Close">×</button></div>
        <p class="pv-muted">They will get access to every workspace.</p>
        <input class="ui-input" value="alex@example.com" aria-label="Email" />
        <div class="pv-dialog-foot">
          <button type="button" class="ui-btn ui-btn-ghost ui-btn-sm" data-pv-close-dialog>Cancel</button>
          <button type="button" class="ui-btn ui-btn-primary ui-btn-sm" data-pv-close-dialog>Send invite</button>
        </div>
      </div>
    </div>`,
  dropzone: `
    <label class="pv-dropzone" data-pv-dropzone>
      <input type="file" multiple class="pv-file" data-pv-file />
      <span class="pv-plus">+</span>
      <strong>Drop files here</strong>
      <span class="pv-muted">PNG, JPG up to 20 MB</span>
      <span class="pv-files pv-muted" data-pv-files></span>
    </label>`,
  field: `
    <div class="pv-stack">
      <label class="ui-label" for="pv-field-input">Workspace name</label>
      <input id="pv-field-input" class="ui-input ui-input-invalid" value="Already taken" />
      <p class="ui-error">That name is already in use.</p>
    </div>`,
  input: `
    <div class="pv-stack">
      <label class="ui-label" for="pv-input-name">Workspace name</label>
      <input id="pv-input-name" class="ui-input ui-input-focus" value="Alpenglow" />
      <input class="ui-input" placeholder="you@example.com" aria-label="Email" />
    </div>`,
  kbd: `
    <div class="pv-row pv-gap-lg">
      <span class="ui-kbd">Ctrl K</span>
      <span class="ui-kbd">⌘ ↵</span>
      <span class="ui-kbd">Esc</span>
    </div>`,
  label: `
    <div class="pv-stack">
      <label class="ui-label" for="pv-label-input">Workspace name <span class="pv-required">*</span></label>
      <input id="pv-label-input" class="ui-input" value="Alpenglow" />
      <span class="ui-label pv-muted">Optional label</span>
    </div>`,
  progress: `
    <div class="pv-stack" data-pv-progress>
      <div class="pv-row pv-between"><span class="pv-muted">Storage</span><span class="pv-muted" data-pv-progress-value>64%</span></div>
      <div class="ui-progress"><span style="width: 64%"></span></div>
      <input type="range" min="0" max="100" value="64" class="pv-range" data-pv-range aria-label="Progress value" />
    </div>`,
  select: `
    <div class="pv-select" data-pv-select>
      <button type="button" class="ui-input pv-input-icon" data-pv-select-trigger aria-expanded="true">
        <span data-pv-value>Editor</span><span class="pv-chevron">⌄</span>
      </button>
      <div class="pv-menu pv-menu-inline" data-pv-menu data-open="true">
        <button type="button" class="pv-menu-item" data-pv-option data-value="Viewer">Viewer</button>
        <button type="button" class="pv-menu-item pv-menu-active" data-pv-option data-value="Editor">Editor</button>
        <button type="button" class="pv-menu-item" data-pv-option data-value="Admin">Admin</button>
      </div>
    </div>`,
  separator: `
    <div class="pv-stack pv-gap-lg">
      <div class="pv-sep"><span></span><em>or</em><span></span></div>
      <div class="pv-sep pv-sep-plain"></div>
    </div>`,
  skeleton: `
    <div class="pv-skeleton">
      <div class="pv-skeleton-row"><span class="pv-skel pv-skel-avatar"></span><span class="pv-skel pv-skel-line"></span></div>
      <span class="pv-skel pv-skel-wide"></span>
      <span class="pv-skel pv-skel-short"></span>
    </div>`,
  switch: `
    <div class="pv-stack">
      <div class="ui-control-row">
        <button type="button" class="ui-switch ui-switch-on" role="switch" aria-checked="true" data-pv-switch><span></span></button>
        <span class="ui-control-label">Beta channel</span>
      </div>
      <div class="ui-control-row">
        <button type="button" class="ui-switch" role="switch" aria-checked="false" data-pv-switch><span></span></button>
        <span class="ui-control-label">Auto-update</span>
      </div>
    </div>`,
  tabs: `
    <div class="pv-stack" data-pv-tabs>
      <div class="ui-tabs" role="tablist">
        <button type="button" class="ui-tab ui-tab-active" data-pv-tab data-target="overview" role="tab" aria-selected="true">Overview</button>
        <button type="button" class="ui-tab" data-pv-tab data-target="members" role="tab" aria-selected="false">Members</button>
        <button type="button" class="ui-tab" data-pv-tab data-target="billing" role="tab" aria-selected="false">Billing</button>
      </div>
      <div class="pv-panel" data-pv-panel="overview">Workspace settings and the current plan.</div>
      <div class="pv-panel" data-pv-panel="members" hidden>Twelve people have access.</div>
      <div class="pv-panel" data-pv-panel="billing" hidden>Next invoice on 1 Dec.</div>
    </div>`,
  textarea: `
    <div class="pv-stack">
      <label class="ui-label" for="pv-textarea">About</label>
      <textarea id="pv-textarea" class="pv-textarea-input" rows="3" aria-label="About">A small workspace for the team.</textarea>
      <span class="pv-muted">Markdown is not rendered here.</span>
    </div>`,
  tooltip: `
    <div class="pv-tooltip-wrap">
      <button type="button" class="ui-btn ui-btn-outline">Hover me</button>
      <span class="pv-tooltip">Copy to clipboard <span class="pv-tooltip-key">⌘ C</span></span>
    </div>`,
  "window-header": `
    <div class="pv-window">
      <div class="pv-window-bar"><span class="pv-traffic"></span><span class="pv-traffic"></span><span class="pv-traffic"></span><span class="pv-window-title">Alpenglow</span></div>
      <div class="pv-window-body"><span class="pv-skel pv-skel-line"></span><span class="pv-skel pv-skel-short"></span></div>
    </div>`,
} as const

export type PreviewName = keyof typeof PREVIEWS

export const COMPONENTS: readonly {
  name: PreviewName
  title: string
  meta: string
}[] = [
  { name: "accordion", title: "Accordion", meta: "one panel · keyboard" },
  { name: "alert", title: "Alert", meta: "4 tones · inline" },
  { name: "avatar", title: "Avatar", meta: "photo · initials" },
  { name: "badge", title: "Badge", meta: "5 tones · status" },
  { name: "button", title: "Button", meta: "6 variants · 4 sizes" },
  { name: "card", title: "Card", meta: "3 surfaces · 6 parts" },
  { name: "checkbox", title: "Checkbox", meta: "controlled · keyboard" },
  { name: "combobox", title: "Combobox", meta: "search · keyboard" },
  { name: "context-menu", title: "ContextMenu", meta: "right click · layer" },
  { name: "dialog", title: "Dialog", meta: "portal · focus trap" },
  { name: "dropzone", title: "Dropzone", meta: "drop · paths" },
  { name: "field", title: "Field", meta: "label · hint · error" },
  { name: "input", title: "Input", meta: "focus · invalid" },
  { name: "kbd", title: "Kbd", meta: "keyboard · pill" },
  { name: "label", title: "Label", meta: "required mark" },
  { name: "progress", title: "Progress", meta: "bar · percent" },
  { name: "select", title: "Select", meta: "keyboard · values" },
  { name: "separator", title: "Separator", meta: "line · label" },
  { name: "skeleton", title: "Skeleton", meta: "block · quiet" },
  { name: "switch", title: "Switch", meta: "on · off" },
  { name: "tabs", title: "Tabs", meta: "segmented · line" },
  { name: "textarea", title: "Textarea", meta: "3 → 8 rows" },
  { name: "tooltip", title: "Tooltip", meta: "inverted · hint" },
  { name: "window-header", title: "WindowHeader", meta: "chrome · insets" },
]
