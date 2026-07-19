export const defaultPublicBrandName = "CapitolWonk CE";

export function getPublicBrandName() {
  return process.env.NEXT_PUBLIC_APP_NAME?.trim() || defaultPublicBrandName;
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
