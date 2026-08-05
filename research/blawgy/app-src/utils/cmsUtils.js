export function hasWordPressConnection(siteSettings) {
  if (!siteSettings || siteSettings.blogType !== 'wordpress') {
    return false;
  }

  const username = typeof siteSettings.username === 'string' ? siteSettings.username.trim() : '';
  const appPassword = typeof siteSettings.appPassword === 'string' ? siteSettings.appPassword.trim() : '';
  const site = typeof siteSettings.site === 'string' ? siteSettings.site.trim() : '';

  return Boolean(site && username && appPassword);
}
