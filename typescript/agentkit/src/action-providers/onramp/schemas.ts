import { z } from "zod";

/**
 * Action schemas for the onramp action provider.
 *
 * This file contains the Zod schemas that define the shape and validation
 * rules for action parameters in the onramp action provider.
 */

/**
 * Example action schema demonstrating various field types and validations.
 * Replace or modify this with your actual action schemas.
 */
export const GetOnrampBuyUrlActionSchema = z.object({
  /**
   * The cryptocurrency asset to purchase (ETH, USDC, or BTC)
   */
  asset: z
    .enum(["ETH", "USDC", "BTC"])
    .default("ETH")
    .describe(
      "The cryptocurrency to purchase. Use this when you need to buy more funds to complete transactions.",
    ),
});
