(function () {
  const THEME_KEY = 'clout-theme';

  function getStoredTheme() {
    try {
      return localStorage.getItem(THEME_KEY);
    } catch (error) {
      return null;
    }
  }

  function setStoredTheme(theme) {
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch (error) {
      // Ignore storage errors (private browsing, blocked cookies, etc.)
    }
  }

  function preferredTheme() {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  }

  function currentTheme() {
    const attrTheme = document.documentElement.getAttribute('data-bs-theme');
    if (attrTheme === 'dark' || attrTheme === 'light') {
      return attrTheme;
    }
    return getStoredTheme() || preferredTheme();
  }

  function applyThemeToNavbar(theme) {
    const isDark = theme === 'dark';

    document.querySelectorAll('.navbar').forEach((navbar) => {
      navbar.classList.toggle('navbar-dark', isDark);
      navbar.classList.toggle('bg-dark', isDark);
      navbar.classList.toggle('navbar-light', !isDark);
      navbar.classList.toggle('bg-light', !isDark);
    });

    document.querySelectorAll('.theme-outline-btn').forEach((btn) => {
      btn.classList.toggle('btn-outline-light', isDark);
      btn.classList.toggle('btn-outline-dark', !isDark);
    });

    document.querySelectorAll('.dropdown-menu').forEach((menu) => {
      menu.classList.toggle('dropdown-menu-dark', isDark);
    });
  }

  function updateToggleIcon(theme) {
    const isDark = theme === 'dark';
    const nextLabel = isDark ? 'Switch to light mode' : 'Switch to dark mode';

    document.querySelectorAll('.theme-toggle-btn').forEach((button) => {
      button.setAttribute('aria-label', nextLabel);
      button.setAttribute('title', nextLabel);

      const icon = button.querySelector('i');
      if (!icon) {
        return;
      }

      icon.classList.remove('bi-sun-fill', 'bi-moon-stars-fill');
      icon.classList.add(isDark ? 'bi-sun-fill' : 'bi-moon-stars-fill');
    });
  }

  function setTheme(theme, persist) {
    document.documentElement.setAttribute('data-bs-theme', theme);
    applyThemeToNavbar(theme);
    updateToggleIcon(theme);
    if (persist) {
      setStoredTheme(theme);
    }
  }

  function toggleTheme() {
    const newTheme = currentTheme() === 'dark' ? 'light' : 'dark';
    setTheme(newTheme, true);
  }

  function initializeTheme() {
    const initialTheme = currentTheme();
    setTheme(initialTheme, false);

    document.querySelectorAll('.theme-toggle-btn').forEach((button) => {
      button.addEventListener('click', toggleTheme);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeTheme);
  } else {
    initializeTheme();
  }
})();
