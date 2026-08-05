/**
 * Frontend Domain Validation and Processing Utilities
 * Mirrors the backend implementation for consistency
 */

/**
 * Validates if a string is a valid domain name
 * Supports:
 * - Standard domains (example.com)
 * - Subdomains (sub.example.com, deep.sub.example.com)
 * - Multi-part TLDs (.co.uk, .com.au, .gov.uk)
 * - International domains (xn-- encoded)
 * - Hyphenated domains (my-site.com)
 * 
 * @param {string} domain - The domain to validate
 * @returns {object} - { isValid: boolean, error?: string }
 */
export function validateDomain(domain) {
  if (!domain || typeof domain !== 'string') {
    return { isValid: false, error: 'Domain is required and must be a string' };
  }

  const trimmedDomain = domain.trim();
  
  if (!trimmedDomain) {
    return { isValid: false, error: 'Domain cannot be empty' };
  }

  // Additional validation: check total length (253 characters max for FQDN)
  if (trimmedDomain.length > 253) {
    return { isValid: false, error: 'Domain name is too long (maximum 253 characters)' };
  }

  // Check individual label lengths (63 characters max per label)
  const labels = trimmedDomain.split('.');
  for (const label of labels) {
    if (label.length > 63) {
      return { isValid: false, error: 'Domain label is too long (maximum 63 characters per part)' };
    }
  }

  // Check for hyphens at start/end of domain or any label
  if (trimmedDomain.startsWith('-') || trimmedDomain.endsWith('-')) {
    return { isValid: false, error: 'Domain cannot start or end with a hyphen' };
  }

  const domainLabels = trimmedDomain.split('.');
  for (const label of domainLabels) {
    if (label.startsWith('-') || label.endsWith('-')) {
      return { isValid: false, error: 'Domain cannot start or end with a hyphen' };
    }
  }

  if (trimmedDomain.startsWith('.') || trimmedDomain.endsWith('.')) {
    return { isValid: false, error: 'Domain cannot start or end with a dot' };
  }

  // Check for consecutive dots
  if (trimmedDomain.includes('..')) {
    return { isValid: false, error: 'Domain cannot contain consecutive dots' };
  }

  // Comprehensive domain regex that supports:
  // - Subdomains of any depth
  // - International domains (xn-- format)
  // - Multi-part TLDs (.co.uk, .com.au, etc.)
  // - Hyphenated domains
  const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.(?:[a-zA-Z0-9]{2,}(?:\.[a-zA-Z0-9]{2,})*)$/;
  
  if (!domainRegex.test(trimmedDomain)) {
    return { 
      isValid: false, 
      error: 'Invalid domain format. Please enter a valid domain (e.g., example.com, sub.example.co.uk)' 
    };
  }

  return { isValid: true };
}

/**
 * Cleans and normalizes a domain by removing protocols, www, trailing slashes, and paths
 * Always returns a clean domain name suitable for database storage
 * 
 * @param {string} domain - The domain to clean
 * @returns {string} - Clean domain name
 */
export function cleanDomain(domain) {
  if (!domain || typeof domain !== 'string') {
    return '';
  }

  let cleaned = domain.trim().toLowerCase();
  
  // Remove protocol (http://, https://)
  cleaned = cleaned.replace(/^https?:\/\//, '');
  
  // Remove www. prefix
  cleaned = cleaned.replace(/^www\./, '');
  
  // Remove trailing slashes, paths, query parameters, and hash fragments
  cleaned = cleaned.replace(/[/?#].*$/, '');
  
  // Remove port numbers
  cleaned = cleaned.replace(/:\d+$/, '');
  
  return cleaned;
}

/**
 * Formats a domain for URL usage by adding https:// protocol
 * 
 * @param {string} domain - The domain to format
 * @returns {string} - Full URL with https:// protocol
 */
export function formatDomainUrl(domain) {
  if (!domain || typeof domain !== 'string') {
    return '';
  }

  const cleaned = cleanDomain(domain);
  
  if (!cleaned) {
    return '';
  }

  // Always add https:// protocol
  return `https://${cleaned}`;
}

/**
 * Validates and cleans a domain in one step
 * Returns an object with validation result and cleaned domain
 * 
 * @param {string} domain - The domain to validate and clean
 * @returns {object} - { isValid: boolean, cleanDomain?: string, error?: string }
 */
export function validateAndCleanDomain(domain) {
  // First clean the domain to remove protocols, www, etc.
  const cleaned = cleanDomain(domain);
  
  // Then validate the cleaned domain
  const validation = validateDomain(cleaned);
  
  if (!validation.isValid) {
    return {
      isValid: false,
      error: validation.error
    };
  }
  
  return {
    isValid: true,
    cleanDomain: cleaned
  };
}

/**
 * Validates a URL for general usage (more permissive than domain-only validation)
 * Allows paths and query parameters
 * 
 * @param {string} url - The URL to validate
 * @returns {object} - { isValid: boolean, error?: string, cleanUrl?: string }
 */
export function validateUrl(url) {
  if (!url || typeof url !== 'string') {
    return { isValid: false, error: 'URL is required and must be a string' };
  }

  const trimmedUrl = url.trim();
  
  if (!trimmedUrl) {
    return { isValid: false, error: 'URL cannot be empty' };
  }

  // Add protocol if missing
  let fullUrl = trimmedUrl;
  if (!/^https?:\/\//.test(fullUrl)) {
    fullUrl = `https://${fullUrl}`;
  }

  // Validate using URL constructor
  try {
    const urlObj = new URL(fullUrl);
    
    // Extract and validate just the hostname
    const domainValidation = validateDomain(urlObj.hostname);
    
    if (!domainValidation.isValid) {
      return { 
        isValid: false, 
        error: `Invalid domain in URL: ${domainValidation.error}` 
      };
    }

    return { 
      isValid: true, 
      cleanUrl: fullUrl,
      domain: urlObj.hostname
    };
  } catch (error) {
    return { 
      isValid: false, 
      error: 'Invalid URL format' 
    };
  }
}

/**
 * Checks if a domain appears to be a development/localhost domain
 * 
 * @param {string} domain - The domain to check
 * @returns {boolean} - True if it's a development domain
 */
export function isDevelopmentDomain(domain) {
  if (!domain || typeof domain !== 'string') {
    return false;
  }

  const cleaned = cleanDomain(domain);
  const devPatterns = [
    'localhost',
    '127.0.0.1',
    '0.0.0.0',
    /^\d+\.\d+\.\d+\.\d+$/, // IP addresses
    /\.local$/,
    /\.dev$/,
    /\.test$/,
    /\.example$/
  ];

  return devPatterns.some(pattern => {
    if (typeof pattern === 'string') {
      return cleaned === pattern;
    }
    return pattern.test(cleaned);
  });
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use validateAndCleanDomain instead
 */
export function validateDomainLegacy(domain) {
  const result = validateAndCleanDomain(domain);
  return result.isValid;
} 