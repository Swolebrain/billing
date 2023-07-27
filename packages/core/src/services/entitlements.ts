import { EntitlementInterface, getEntitlementById, saveEntitlement, updateEntitlement } from 'src/repositories/entitlements';
import Stripe from 'stripe';

export const handleProductCreatedEvent = async (stripeEvent: Stripe.Event) => {
    const product = stripeEvent.data.object as Stripe.Product;
    const result = await saveEntitlement({
        entitlementId: product.id,
        name: product.name,
        description: product.description,
        active: product.active,
        linkedStripePrices: [],
        linkedStripeProductId: product.id,
    });

    if (result.$response.error) {
        // Handle Error Logic
        return;
    }
};

export const handleProductUpdatedEvent = async (stripeEvent: Stripe.Event) => {
    const prev = stripeEvent.data.previous_attributes;
    if (!prev || Object.keys(prev).length === 0) return;

    const product = stripeEvent.data.object as Stripe.Product;

    const productPropertiesToCheck = ['name', 'description'] as const;

    const updatedEntitlementValues = productPropertiesToCheck.reduce((map, key) => {
        if (key in prev) {
            // @ts-ignore
            map[key] = product[key];
        }

        return map;
    }, {} as Partial<EntitlementInterface>);

    const result = await getEntitlementById(product.id);

    if (result.$response.error) {
        // Handle Error Logic
        return;
    }

    if (!result.Item) {
        return;
    }

    const entitlementMutation = await updateEntitlement({ ...updatedEntitlementValues, entitlementId: result.Item.entitlementId });

    if (entitlementMutation.$response.error) {
        // Handle Error Logic
        return;
    }
};
