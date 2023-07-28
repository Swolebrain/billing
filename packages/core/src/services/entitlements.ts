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

    const entitlementMutationResult = await updateEntitlement({ ...updatedEntitlementValues, entitlementId: result.Item.entitlementId });

    if (entitlementMutationResult.$response.error) {
        // Handle Error Logic
        return;
    }
};

export const handlePriceCreatedEvent = async (stripeEvent: Stripe.Event) => {
    const price = stripeEvent.data.object as Stripe.Price;
    const entitlementQueryResult = await getEntitlementById(typeof price.product === 'string' ? price.product : price.product.id);

    if (entitlementQueryResult.$response.error) {
        return;
    }

    if (!entitlementQueryResult.Item) {
        return;
    }

    const entitlement = entitlementQueryResult.Item;
    const entitlementMutationResult = await updateEntitlement({
        entitlementId: entitlement.entitlementId,
        linkedStripePrices: [...entitlement.linkedStripePrices, { priceId: price.id, active: price.active }],
    });

    if (entitlementMutationResult.$response.error) {
        return;
    }
};

export const handlePriceUpdatedEvent = async (stripeEvent: Stripe.Event) => {
    const price = stripeEvent.data.object as Stripe.Price;
    const entitlementQueryResult = await getEntitlementById(typeof price.product === 'string' ? price.product : price.product.id);

    if (entitlementQueryResult.$response.error) {
        return;
    }

    if (!entitlementQueryResult.Item) {
        return;
    }

    const entitlement = entitlementQueryResult.Item;
    const entitlementMutationResult = await updateEntitlement({
        entitlementId: entitlement.entitlementId,
        linkedStripePrices: entitlement.linkedStripePrices.map((linkedStripePrice) =>
            linkedStripePrice.priceId === price.id ? { ...linkedStripePrice, active: price.active } : linkedStripePrice
        ),
    });

    if (entitlementMutationResult.$response.error) {
        return;
    }
};
