const header = document.querySelector(".site-header");
const toggle = document.querySelector(".menu-toggle");
const navLinks = Array.from(document.querySelectorAll("[data-route]"));
const routePages = Array.from(document.querySelectorAll("[data-route-page]"));
const dropdown = document.querySelector("[data-nav-dropdown]");
const dropdownToggle = document.querySelector("[data-nav-dropdown-toggle]");
const dropdownMenu = document.querySelector("[data-nav-dropdown-menu]");
const billingButtons = Array.from(document.querySelectorAll("[data-billing-toggle]"));
const priceValues = Array.from(document.querySelectorAll("[data-price]"));
const priceNotes = Array.from(document.querySelectorAll("[data-price-note]"));
const faqLists = Array.from(document.querySelectorAll(".faq-list"));
const authMessage = document.querySelector("[data-auth-message]");
const authStatus = document.querySelector("[data-auth-status]");
const googleSignIn = document.querySelector("[data-google-signin]");
const loginLink = document.querySelector("[data-auth-login]");
const signupLink = document.querySelector("[data-auth-signup]");
const accountLink = document.querySelector("[data-auth-account]");
const logoutButtons = Array.from(document.querySelectorAll("[data-auth-logout]"));
const accountName = document.querySelector("[data-account-name]");
const accountEmail = document.querySelector("[data-account-email]");
const accountRole = document.querySelector("[data-account-role]");
const accountAvatar = document.querySelector("[data-account-avatar]");
const accountInitial = document.querySelector("[data-account-initial]");
const accountUpdated = document.querySelector("[data-account-updated]");
const accountWorkspace = document.querySelector("[data-account-workspace]");
const accountTeamEmail = document.querySelector("[data-account-team-email]");
const accountTeamInitial = document.querySelector("[data-account-team-initial]");
const accountViewButtons = Array.from(document.querySelectorAll("[data-account-view]"));
const accountPanels = Array.from(document.querySelectorAll("[data-account-panel]"));
const settingsTabButtons = Array.from(document.querySelectorAll("[data-settings-tab]"));
const settingsPanels = Array.from(document.querySelectorAll("[data-settings-panel]"));
const accountDirtyInputs = Array.from(document.querySelectorAll("[data-account-dirty]"));
const accountSaveButton = document.querySelector("[data-account-save]");
const toggleButtons = Array.from(document.querySelectorAll("[data-toggle-button]"));

const routes = new Map([
  ["/blog", "blog"],
  ["/features", "features"],
  ["/pricing", "pricing"],
  ["/login", "login"],
  ["/signup", "signup"],
  ["/affiliate", "affiliate"],
  ["/changelog", "changelog"],
  ["/privacy", "privacy"],
  ["/terms", "terms"],
  ["/account", "account"],
]);

const authState = {
  ready: false,
  config: null,
  user: null,
};
let accountState = null;
let dropdownCloseTimer = null;

function resolveRoute(pathname) {
  if (pathname.startsWith("/case-studies/")) return "case-study";
  if (pathname === "/" || pathname === "") return "home";
  return routes.get(pathname) || "not-found";
}

function setActiveNav(route) {
  navLinks.forEach((link) => {
    const linkRoute = link.dataset.route;
    if (linkRoute === route) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  });
}

function closeDropdown() {
  if (!dropdown || !dropdownToggle) return;
  clearDropdownClose();
  dropdown.classList.remove("is-open");
  dropdownToggle.setAttribute("aria-expanded", "false");
}

function openDropdown() {
  if (!dropdown || !dropdownToggle) return;
  clearDropdownClose();
  dropdown.classList.add("is-open");
  dropdownToggle.setAttribute("aria-expanded", "true");
}

function clearDropdownClose() {
  if (!dropdownCloseTimer) return;
  window.clearTimeout(dropdownCloseTimer);
  dropdownCloseTimer = null;
}

function scheduleDropdownClose() {
  clearDropdownClose();
  dropdownCloseTimer = window.setTimeout(closeDropdown, 220);
}

function toggleDropdown() {
  if (!dropdown || !dropdownToggle) return;
  clearDropdownClose();
  const open = !dropdown.classList.contains("is-open");
  dropdown.classList.toggle("is-open", open);
  dropdownToggle.setAttribute("aria-expanded", String(open));
}

function setBilling(period) {
  billingButtons.forEach((button) => {
    const active = button.dataset.billingToggle === period;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });

  priceValues.forEach((price) => {
    price.textContent = price.dataset[period] || price.textContent;
  });

  priceNotes.forEach((note) => {
    note.textContent = note.dataset[period] || note.textContent;
  });
}

function initFaqAccordions() {
  faqLists.forEach((list) => {
    const items = Array.from(list.querySelectorAll("details"));
    const openItems = items.filter((item) => item.open);

    openItems.slice(1).forEach((item) => {
      item.open = false;
    });

    items.forEach((item) => {
      item.addEventListener("toggle", () => {
        if (!item.open) return;

        items.forEach((otherItem) => {
          if (otherItem !== item) {
            otherItem.open = false;
          }
        });
      });
    });
  });
}

function renderRoute() {
  const route = resolveRoute(window.location.pathname);

  if (route === "account" && authState.ready && !authState.user) {
    window.history.replaceState({}, "", "/login?next=/account");
    renderRoute();
    return;
  }

  document.body.classList.toggle("route-active", route !== "home");
  document.body.classList.toggle("route-account", route === "account");

  routePages.forEach((page) => {
    page.hidden = page.dataset.routePage !== route;
  });

  setActiveNav(route);
  if (route !== "home") {
    window.scrollTo({ top: 0, behavior: "instant" });
  }
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    credentials: "same-origin",
    headers: {
      "content-type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok || payload.ok === false) {
    throw new Error(payload.error || "Request failed.");
  }

  return payload;
}

function setAuthMessage(message, isError = false) {
  if (!authMessage) return;
  authMessage.textContent = message;
  authMessage.classList.toggle("is-error", isError);
}

function renderAuthState() {
  const signedIn = Boolean(authState.user);

  if (loginLink) loginLink.hidden = signedIn;
  if (signupLink) signupLink.hidden = signedIn;
  if (accountLink) {
    accountLink.hidden = !signedIn;
    accountLink.setAttribute("aria-label", signedIn ? `Open account for ${authState.user.email}` : "Open account");
  }
  logoutButtons.forEach((button) => {
    button.hidden = !signedIn;
  });

  if (authStatus) {
    authStatus.textContent = signedIn ? authState.user.email : "";
  }

  if (signedIn) {
    setAuthMessage(`Signed in as ${authState.user.email}.`);
  }

  renderAccountState();
}

function renderAccountState() {
  const user = authState.user;

  if (!accountName || !accountEmail || !accountRole || !accountInitial || !accountUpdated) return;

  if (!user) {
    accountName.textContent = "Account";
    accountEmail.textContent = "Sign in to view account details.";
    accountRole.textContent = "Signed out";
    accountInitial.textContent = "S";
    accountUpdated.textContent = "Waiting for sign-in";
    if (accountWorkspace) accountWorkspace.textContent = "sirbloggsalot.com";
    if (accountTeamEmail) accountTeamEmail.textContent = "Checking session...";
    if (accountTeamInitial) accountTeamInitial.textContent = "S";
    if (accountAvatar) {
      accountAvatar.hidden = true;
      accountAvatar.removeAttribute("src");
    }
    return;
  }

  const displayName = user.name || user.email;
  accountName.textContent = displayName;
  accountEmail.textContent = user.email;
  accountRole.textContent = user.role === "admin" ? "Admin" : "Client";
  accountInitial.textContent = displayName.trim().charAt(0).toUpperCase() || "S";
  accountUpdated.textContent = `Session checked ${new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
  if (accountWorkspace) accountWorkspace.textContent = user.email.split("@")[0] || "sirbloggsalot.com";
  if (accountTeamEmail) accountTeamEmail.textContent = user.email;
  if (accountTeamInitial) accountTeamInitial.textContent = accountInitial.textContent;

  if (accountAvatar) {
    if (user.picture) {
      accountAvatar.src = user.picture;
      accountAvatar.alt = "";
      accountAvatar.hidden = false;
    } else {
      accountAvatar.hidden = true;
      accountAvatar.removeAttribute("src");
    }
  }
}

function accountPanel(name) {
  return document.querySelector(`[data-account-panel="${name}"]`);
}

function settingsPanel(name) {
  return document.querySelector(`[data-settings-panel="${name}"]`);
}

function setToggle(button, active) {
  if (!button) return;
  button.classList.toggle("is-on", Boolean(active));
  button.setAttribute("aria-pressed", String(Boolean(active)));
}

function renderContentPlanItems(items = []) {
  const calendar = document.querySelector(".content-calendar");
  if (!calendar) return;
  calendar.innerHTML = items.length
    ? `<article><header><strong>Saved plan</strong><span>${items.length} items</span></header>${items.map((item) => `
        <div class="content-card" data-plan-id="${item.id}">
          <strong>${escapeForDom(item.title)}</strong>
          <small>${escapeForDom(item.keyword || "No keyword")}</small>
          <p><b>${escapeForDom(item.status || "Draft")}</b><br />${escapeForDom(item.notes || "No notes yet")}</p>
          <time>${escapeForDom(item.targetDate || "Unscheduled")}</time>
        </div>`).join("")}</article>`
    : `<article><header><strong>No content planned</strong></header><p class="account-muted">Add a topic or start an article to begin.</p></article>`;
}

function renderTopics(topics = []) {
  const list = document.querySelector(".topic-list");
  if (!list) return;
  list.innerHTML = topics.length
    ? topics.map((topic) => `<article><strong>${escapeForDom(topic.title)}</strong><span>${escapeForDom(topic.intent || "Topic")}</span><button type="button" data-topic-add="${topic.id}" ${topic.addedToPlan ? "disabled" : ""}>${topic.addedToPlan ? "Added" : "Add"}</button></article>`).join("")
    : `<article><strong>No topics yet</strong><span>Run Find topics</span><button type="button" disabled>Add</button></article>`;
}

function renderCollectionList(type, rows = []) {
  const panel = settingsPanel(type);
  if (!panel) return;
  let target = panel.querySelector("[data-account-list]");
  if (!target) {
    target = document.createElement("div");
    target.dataset.accountList = type;
    target.className = "topic-list";
    panel.appendChild(target);
  }
  target.innerHTML = rows.length
    ? rows.map((row) => `<article><strong>${escapeForDom(row.name || row.email)}</strong><span>${escapeForDom(row.description || row.address || row.role || "")}</span><button type="button" data-delete-row="${type}:${row.id}">Delete</button></article>`).join("")
    : "";
}

function renderInvites(invites = []) {
  const panel = settingsPanel("invite");
  if (!panel) return;
  let target = panel.querySelector("[data-account-list]");
  if (!target) {
    target = document.createElement("div");
    target.dataset.accountList = "invite";
    target.className = "topic-list";
    panel.appendChild(target);
  }
  target.innerHTML = invites.map((invite) => `<article><strong>${escapeForDom(invite.email)}</strong><span>${escapeForDom(invite.link)}</span><button type="button" data-delete-invite="${invite.id}">Revoke</button></article>`).join("");
}

function escapeForDom(value) {
  return String(value || "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[char]));
}

async function loadAccountState() {
  if (!authState.user) return;
  const payload = await requestJson("/api/account/summary");
  accountState = payload.account;
  renderPersistedAccount();
}

function renderPersistedAccount() {
  if (!accountState) return;
  if (accountWorkspace) accountWorkspace.textContent = accountState.profile.workspaceLabel;

  renderContentPlanItems(accountState.contentPlan);
  renderTopics(accountState.topics);
  renderCollectionList("products", accountState.products);
  renderCollectionList("locations", accountState.locations);
  renderInvites(accountState.invites);

  const site = settingsPanel("site");
  if (site) {
    const textareas = site.querySelectorAll("textarea");
    const range = site.querySelector('input[type="range"]');
    if (textareas[0]) textareas[0].value = accountState.settings.site.productDescription || "";
    if (textareas[1]) textareas[1].value = accountState.settings.site.targetAudience || "";
    if (textareas[2]) textareas[2].value = (accountState.settings.site.keywords || []).join(", ");
    if (range) range.value = accountState.settings.site.keywordMix || 45;
  }

  const images = settingsPanel("images");
  if (images) {
    const toggles = images.querySelectorAll("[data-toggle-button]");
    const visualStyle = images.querySelector("textarea");
    setToggle(toggles[0], accountState.settings.images.includeImages);
    setToggle(toggles[1], accountState.settings.images.useProductImages);
    if (visualStyle) visualStyle.value = accountState.settings.images.visualStyle || "";
  }

  const cms = settingsPanel("cms");
  if (cms) {
    const website = cms.querySelector("input");
    const platform = cms.querySelector("select");
    if (website) website.value = accountState.settings.cms.websiteUrl || "";
    if (platform) platform.value = accountState.settings.cms.platform || "Select your website platform";
  }

  const cta = settingsPanel("cta");
  if (cta) {
    setToggle(cta.querySelector("[data-toggle-button]"), accountState.settings.cta.enabled);
    const input = cta.querySelector("input");
    if (input) input.value = accountState.settings.cta.text || "";
  }

  markAccountSaved();
}

function collectSettingsPayload() {
  const site = settingsPanel("site");
  const images = settingsPanel("images");
  const cms = settingsPanel("cms");
  const cta = settingsPanel("cta");
  const siteTextareas = site ? site.querySelectorAll("textarea") : [];
  const imageToggles = images ? images.querySelectorAll("[data-toggle-button]") : [];

  return {
    site: {
      productDescription: siteTextareas[0]?.value || "",
      targetAudience: siteTextareas[1]?.value || "",
      keywords: (siteTextareas[2]?.value || "").split(/[,\n]/).map((item) => item.trim()).filter(Boolean),
      keywordMix: Number(site?.querySelector('input[type="range"]')?.value || 45),
    },
    images: {
      includeImages: imageToggles[0]?.classList.contains("is-on") || false,
      useProductImages: imageToggles[1]?.classList.contains("is-on") || false,
      visualStyle: images?.querySelector("textarea")?.value || "",
    },
    cms: {
      websiteUrl: cms?.querySelector("input")?.value || "",
      platform: cms?.querySelector("select")?.value || "",
    },
    cta: {
      enabled: cta?.querySelector("[data-toggle-button]")?.classList.contains("is-on") || false,
      text: cta?.querySelector("input")?.value || "",
    },
  };
}

async function saveAccountSettings() {
  const payload = await requestJson("/api/account/settings", {
    method: "PUT",
    body: JSON.stringify(collectSettingsPayload()),
  });
  accountState = payload.account;
  renderPersistedAccount();
}

function setAccountView(view) {
  accountViewButtons.forEach((button) => {
    const active = button.dataset.accountView === view;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });

  accountPanels.forEach((panel) => {
    const active = panel.dataset.accountPanel === view;
    panel.hidden = !active;
    panel.classList.toggle("is-active", active);
  });
}

function setSettingsTab(tab) {
  settingsTabButtons.forEach((button) => {
    const active = button.dataset.settingsTab === tab;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-selected", String(active));
  });

  settingsPanels.forEach((panel) => {
    const active = panel.dataset.settingsPanel === tab;
    panel.hidden = !active;
    panel.classList.toggle("is-active", active);
  });

  if (accountPanels.length) {
    setAccountView("settings");
  }
}

function markAccountDirty() {
  if (!accountSaveButton) return;
  accountSaveButton.disabled = false;
  accountSaveButton.textContent = "Save Changes";
}

function markAccountSaved() {
  if (!accountSaveButton) return;
  accountSaveButton.disabled = true;
  accountSaveButton.textContent = "Saved";
  window.setTimeout(() => {
    if (!accountSaveButton.disabled) return;
    accountSaveButton.textContent = "Save Changes";
  }, 1400);
}

function loadGoogleIdentityScript() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error("Google sign-in could not be loaded."));
    document.head.appendChild(script);
  });
}

async function handleGoogleCredential(response) {
  try {
    setAuthMessage("Signing in...");
    const payload = await requestJson("/api/auth/google", {
      method: "POST",
      body: JSON.stringify({ credential: response.credential }),
    });

    authState.user = payload.user;
    renderAuthState();
    await loadAccountState();

    const next = new URLSearchParams(window.location.search).get("next");
    const target = next && next.startsWith("/") ? next : "/dashboard";
    // When the Blawgy SPA is enabled it is the product surface, so hand off to it
    // with a full navigation (the SPA is a separate document served by the server).
    if (authState.config?.blawgyClientEnabled) {
      window.location.assign(target);
      return;
    }
    if (next && next.startsWith("/")) {
      window.history.pushState({}, "", next);
      renderRoute();
    }
  } catch (error) {
    setAuthMessage(error.message, true);
  }
}

async function renderGoogleSignIn() {
  if (!googleSignIn || !authState.config?.googleAuthEnabled || authState.user) return;

  try {
    await loadGoogleIdentityScript();
    window.google.accounts.id.initialize({
      client_id: authState.config.googleClientId,
      callback: handleGoogleCredential,
    });
    window.google.accounts.id.renderButton(googleSignIn, {
      theme: "outline",
      size: "large",
      text: "signin_with",
      shape: "rectangular",
      width: Math.min(360, googleSignIn.offsetWidth || 360),
    });
  } catch (error) {
    // A transient GIS load failure must not leave the sign-in blank — offer a retry.
    googleSignIn.innerHTML = "";
    const retry = document.createElement("button");
    retry.type = "button";
    retry.textContent = "Continue with Google";
    retry.className = "google-signin-retry";
    retry.addEventListener("click", () => renderGoogleSignIn());
    googleSignIn.appendChild(retry);
    setAuthMessage("Tap Continue with Google to sign in.");
  }
}

async function initAuth() {
  try {
    const [config, session] = await Promise.all([
      requestJson("/api/auth/config"),
      requestJson("/api/auth/session"),
    ]);

    authState.config = config;
    authState.user = session.authenticated ? session.user : null;
    authState.ready = true;
    renderAuthState();
    if (authState.user) {
      await loadAccountState();
    }

    if (!config.googleAuthEnabled) {
      setAuthMessage("Google auth is not configured yet. Set SIR_BLOGGS_GOOGLE_CLIENT_ID on the server.", true);
    } else if (!authState.user) {
      setAuthMessage("Use your Google account to continue.");
      await renderGoogleSignIn();
    }
  } catch (error) {
    authState.ready = true;
    setAuthMessage(error.message, true);
  } finally {
    renderRoute();
  }
}

document.addEventListener("click", (event) => {
  const link = event.target.closest("a[href]");
  if (!link) return;

  const url = new URL(link.href, window.location.origin);
  if (url.origin !== window.location.origin) return;

  if (url.pathname === "/" && url.hash) {
    closeDropdown();
    header.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
    return;
  }

  event.preventDefault();
  window.history.pushState({}, "", `${url.pathname}${url.hash}`);
  header.classList.remove("is-open");
  toggle.setAttribute("aria-expanded", "false");
  closeDropdown();
  renderRoute();
});

toggle.addEventListener("click", () => {
  const open = !header.classList.contains("is-open");
  header.classList.toggle("is-open", open);
  toggle.setAttribute("aria-expanded", String(open));
  if (!open) closeDropdown();
});

if (dropdownToggle) {
  dropdownToggle.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    toggleDropdown();
  });
}

if (dropdown) {
  dropdown.addEventListener("mouseenter", openDropdown);
  dropdown.addEventListener("mouseleave", scheduleDropdownClose);
  dropdown.addEventListener("focusout", (event) => {
    if (dropdown.contains(event.relatedTarget)) return;
    scheduleDropdownClose();
  });
}

if (dropdownMenu) {
  dropdownMenu.addEventListener("mouseenter", clearDropdownClose);
  dropdownMenu.addEventListener("mouseleave", scheduleDropdownClose);
}

billingButtons.forEach((button) => {
  button.addEventListener("click", () => setBilling(button.dataset.billingToggle));
});

accountViewButtons.forEach((button) => {
  button.addEventListener("click", () => setAccountView(button.dataset.accountView));
});

settingsTabButtons.forEach((button) => {
  button.addEventListener("click", () => setSettingsTab(button.dataset.settingsTab));
});

accountDirtyInputs.forEach((input) => {
  input.addEventListener("input", markAccountDirty);
  input.addEventListener("change", markAccountDirty);
});

toggleButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const active = !button.classList.contains("is-on");
    button.classList.toggle("is-on", active);
    button.setAttribute("aria-pressed", String(active));
    markAccountDirty();
  });
});

if (accountSaveButton) {
  accountSaveButton.addEventListener("click", async () => {
    try {
      accountSaveButton.textContent = "Saving...";
      await saveAccountSettings();
    } catch (error) {
      accountSaveButton.textContent = "Save failed";
      setAuthMessage(error.message, true);
      markAccountDirty();
    }
  });
}

document.addEventListener("click", async (event) => {
  const topicAdd = event.target.closest("[data-topic-add]");
  const deleteRow = event.target.closest("[data-delete-row]");
  const deleteInvite = event.target.closest("[data-delete-invite]");
  const button = event.target.closest("button");
  if (!topicAdd && !deleteRow && !deleteInvite && !button) return;
  if (!document.body.classList.contains("route-account")) return;

  try {
    if (topicAdd) {
      const payload = await requestJson(`/api/account/topics/${topicAdd.dataset.topicAdd}/add`, { method: "POST", body: "{}" });
      accountState = payload.account;
      renderPersistedAccount();
      return;
    }

    if (deleteRow) {
      const [type, id] = deleteRow.dataset.deleteRow.split(":");
      const payload = await requestJson(`/api/account/${type}/${id}`, { method: "DELETE" });
      accountState = payload.account;
      renderPersistedAccount();
      return;
    }

    if (deleteInvite) {
      const payload = await requestJson(`/api/account/invites/${deleteInvite.dataset.deleteInvite}`, { method: "DELETE" });
      accountState = payload.account;
      renderPersistedAccount();
      return;
    }

    const label = button.textContent.trim();
    const activePanel = accountPanels.find((panel) => !panel.hidden);
    const activeSettings = settingsPanels.find((panel) => !panel.hidden);

    if (label === "Strategy") {
      window.alert("Strategy uses your saved site settings, keywords, products, locations, CTA, and CMS status. Save those settings before generating a larger plan.");
    } else if (label === "+ Add topics") {
      const title = window.prompt("Topic title");
      if (!title) return;
      const keyword = window.prompt("Keyword", title) || "";
      const payload = await requestJson("/api/account/content-plan", { method: "POST", body: JSON.stringify({ title, keyword, status: "Draft", notes: "Added manually from Content Plan." }) });
      accountState = payload.account;
      renderPersistedAccount();
    } else if (label === "↻") {
      await loadAccountState();
    } else if (label === "Start article") {
      const writePanel = accountPanel("write");
      const title = writePanel?.querySelector("input")?.value || "Untitled article";
      const keyword = writePanel?.querySelectorAll("input")[1]?.value || "";
      const notes = writePanel?.querySelector("textarea")?.value || "";
      const payload = await requestJson("/api/account/content-plan", { method: "POST", body: JSON.stringify({ title, keyword, notes, status: "Draft" }) });
      accountState = payload.account;
      renderPersistedAccount();
      setAccountView("plan");
    } else if (label === "Find topics") {
      const query = window.prompt("Search phrase", accountState?.settings?.site?.keywords?.[0] || "local visibility");
      if (!query) return;
      const payload = await requestJson("/api/account/topics/search", { method: "POST", body: JSON.stringify({ query }) });
      accountState = payload.account;
      renderPersistedAccount();
    } else if (label === "Add" && activePanel?.dataset.accountPanel === "topics") {
      const title = button.closest("article")?.querySelector("strong")?.textContent || "Topic idea";
      const payload = await requestJson("/api/account/content-plan", { method: "POST", body: JSON.stringify({ title, status: "Draft", notes: "Added from static topic suggestion." }) });
      accountState = payload.account;
      renderPersistedAccount();
      button.disabled = true;
      button.textContent = "Added";
    } else if (label === "+ Add Product") {
      const name = window.prompt("Product name");
      if (!name) return;
      const description = window.prompt("Short product description", "") || "";
      const payload = await requestJson("/api/account/products", { method: "POST", body: JSON.stringify({ name, description }) });
      accountState = payload.account;
      renderPersistedAccount();
    } else if (label === "+ Add a location") {
      const name = window.prompt("Location name");
      if (!name) return;
      const address = window.prompt("Address or service area", "") || "";
      const payload = await requestJson("/api/account/locations", { method: "POST", body: JSON.stringify({ name, address }) });
      accountState = payload.account;
      renderPersistedAccount();
    } else if (label === "Generate Invite Link") {
      const emailInput = activeSettings?.querySelector('input[type="email"]');
      const email = emailInput?.value || window.prompt("Invite email");
      if (!email) return;
      const payload = await requestJson("/api/account/invites", { method: "POST", body: JSON.stringify({ email, role: "Editor" }) });
      accountState = payload.account;
      renderPersistedAccount();
    } else if (label.includes("Generate using AI")) {
      const site = settingsPanel("site");
      const description = site?.querySelector("textarea");
      if (description) {
        description.value = "This business helps customers make confident buying decisions with clear services, useful education, and consistent local proof.";
        markAccountDirty();
      }
    } else if (label === "Connect") {
      if (activePanel?.dataset.accountPanel === "search") {
        const payload = await requestJson("/api/account/search-console/connect", { method: "POST", body: "{}" });
        setAuthMessage(payload.data?.message || payload.message || "Search Console is not wired yet.", true);
      } else {
        window.alert("This integration is not wired yet. Save CMS settings first, then connect the provider when the integration is available.");
      }
    } else if (button.classList.contains("account-help-bubble")) {
      setAccountView("help");
    }
  } catch (error) {
    setAuthMessage(error.message, true);
  }
});

logoutButtons.forEach((button) => {
  button.addEventListener("click", async () => {
    try {
      await requestJson("/api/auth/logout", { method: "POST", body: "{}" });
    } finally {
      authState.user = null;
      renderAuthState();
      setAuthMessage("Signed out.");
      if (window.location.pathname !== "/login") {
        window.history.pushState({}, "", "/login");
      }
      renderRoute();
      renderGoogleSignIn();
    }
  });
});

document.addEventListener("click", (event) => {
  if (!dropdown || dropdown.contains(event.target)) return;
  closeDropdown();
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  closeDropdown();
});

window.addEventListener("popstate", renderRoute);
initFaqAccordions();
initAuth();
