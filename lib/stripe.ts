import Stripe from "stripe";
import { requiredEnv } from "./env";

export const stripe = new Stripe(requiredEnv("STRIPE_SECRET_KEY"), {
    apiVersion: "2026-01-28.clover",
});
