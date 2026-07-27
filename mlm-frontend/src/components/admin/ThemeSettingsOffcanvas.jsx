import { useState, useEffect } from "react";

const DEFAULTS = {
  theme: "light",
  topbar: "light",
  menu: "dark",
  size: "sm-hover-active",
};

function applyAll(cfg) {
  const html = document.documentElement;
  html.setAttribute("data-bs-theme", cfg.theme);
  html.setAttribute("data-topbar-color", cfg.topbar);
  html.setAttribute("data-menu-color", cfg.menu);
  html.setAttribute("data-menu-size", cfg.size);
  sessionStorage.setItem(
    "__LARKON_CONFIG__",
    JSON.stringify({
      theme: cfg.theme,
      topbar: { color: cfg.topbar },
      menu: { color: cfg.menu, size: cfg.size },
    })
  );
}

function ThemeSettingsOffcanvas() {
  const [cfg, setCfg] = useState(DEFAULTS);

  useEffect(() => {
    const html = document.documentElement;
    setCfg({
      theme: html.getAttribute("data-bs-theme") || DEFAULTS.theme,
      topbar: html.getAttribute("data-topbar-color") || DEFAULTS.topbar,
      menu: html.getAttribute("data-menu-color") || DEFAULTS.menu,
      size: html.getAttribute("data-menu-size") || DEFAULTS.size,
    });
  }, []);

  function update(key, value) {
    const next = { ...cfg, [key]: value };
    setCfg(next);
    applyAll(next);
  }

  function handleReset() {
    setCfg(DEFAULTS);
    applyAll(DEFAULTS);
    sessionStorage.removeItem("__LARKON_CONFIG__");
  }

  const sizeOptions = [
    { value: "default", label: "Default" },
    { value: "condensed", label: "Condensed" },
    { value: "hidden", label: "Hidden" },
    { value: "sm-hover-active", label: "Small Hover Active" },
    { value: "sm-hover", label: "Small Hover" },
  ];

  return (
    <div
      className="offcanvas offcanvas-end"
      tabIndex="-1"
      id="theme-settings-offcanvas"
      aria-labelledby="theme-settings-offcanvas-label"
    >
      <div className="offcanvas-header bg-primary">
        <h5 className="offcanvas-title text-white" id="theme-settings-offcanvas-label">
          Theme Settings
        </h5>
        <button
          type="button"
          className="btn-close btn-close-white"
          data-bs-dismiss="offcanvas"
          aria-label="Close"
        ></button>
      </div>

      <div className="offcanvas-body">
        <h6 className="fw-bold mb-2">Color Scheme</h6>
        <div className="mb-4">
          {["light", "dark"].map((opt) => (
            <div className="form-check" key={opt}>
              <input
                className="form-check-input"
                type="radio"
                name="theme-mode"
                id={`theme-mode-${opt}`}
                checked={cfg.theme === opt}
                onChange={() => update("theme", opt)}
              />
              <label className="form-check-label text-capitalize" htmlFor={`theme-mode-${opt}`}>
                {opt}
              </label>
            </div>
          ))}
        </div>

        <h6 className="fw-bold mb-2">Topbar Color</h6>
        <div className="mb-4">
          {["light", "dark"].map((opt) => (
            <div className="form-check" key={opt}>
              <input
                className="form-check-input"
                type="radio"
                name="topbar-color"
                id={`topbar-color-${opt}`}
                checked={cfg.topbar === opt}
                onChange={() => update("topbar", opt)}
              />
              <label className="form-check-label text-capitalize" htmlFor={`topbar-color-${opt}`}>
                {opt}
              </label>
            </div>
          ))}
        </div>

        <h6 className="fw-bold mb-2">Menu Color</h6>
        <div className="mb-4">
          {["light", "dark"].map((opt) => (
            <div className="form-check" key={opt}>
              <input
                className="form-check-input"
                type="radio"
                name="menu-color"
                id={`menu-color-${opt}`}
                checked={cfg.menu === opt}
                onChange={() => update("menu", opt)}
              />
              <label className="form-check-label text-capitalize" htmlFor={`menu-color-${opt}`}>
                {opt}
              </label>
            </div>
          ))}
        </div>

        <h6 className="fw-bold mb-2">Sidebar Size</h6>
        <div className="mb-4">
          {sizeOptions.map((opt) => (
            <div className="form-check" key={opt.value}>
              <input
                className="form-check-input"
                type="radio"
                name="menu-size"
                id={`menu-size-${opt.value}`}
                checked={cfg.size === opt.value}
                onChange={() => update("size", opt.value)}
              />
              <label className="form-check-label" htmlFor={`menu-size-${opt.value}`}>
                {opt.label}
              </label>
            </div>
          ))}
        </div>

        <button type="button" className="btn btn-danger w-100" onClick={handleReset}>
          Reset
        </button>
      </div>
    </div>
  );
}

export default ThemeSettingsOffcanvas;