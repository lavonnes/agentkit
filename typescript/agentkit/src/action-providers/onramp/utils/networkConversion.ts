export const convertNetworkIdToOnrampNetworkId = (networkId: string): string | null => {
  switch (networkId) {
    case "base-mainnet":
      return "base";
    case "base-sepolia":
      return "base-sepolia";
    default:
      return null;
  }
};
