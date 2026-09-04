export const defaultPublicBrandName = "CapitolWonk";

export function getPublicBrandName() {
  const configuredName = process.env.NEXT_PUBLIC_APP_NAME?.trim();
  // Keep a previously configured display name from restoring the retired suffix.
  if (!configuredName || /^CapitolWonk(?:\s+CE)?$/i.test(configuredName)) return defaultPublicBrandName;
  return configuredName;
}

export const publicBrandName = getPublicBrandName();

export const publicBrand = {
  accountabilityLabel: `${publicBrandName} Accountability v1.0`,
  accountLabel: `${publicBrandName} account`,
  citizenLabel: `${publicBrandName} Citizen`,
  name: publicBrandName,
  privacyTitle: `${publicBrandName} Privacy Policy`,
  proLabel: `${publicBrandName} Pro`,
  supportTitle: `${publicBrandName} Support`,
  userLabel: `${publicBrandName} user`
};
