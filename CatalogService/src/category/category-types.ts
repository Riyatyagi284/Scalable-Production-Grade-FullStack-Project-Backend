export interface PriceConfiguration {
    [key: string]: {
        priceType: "base" | "aditional";
        availableOptions: string[];
    };
}

export interface Attribute {
    name: string;
    widgetType: "switch" | "radio";
    defaultValue: string;
    availableOptions: string[];
}

export interface Category {
    name: string;
    priceConfiguration: PriceConfiguration;
    attributes: Attribute[];
}

export function validatePriceConfiguration(priceConfig: PriceConfiguration) {
    const baseCount = Object.values(priceConfig).filter(
        (c) => c.priceType === "base",
    ).length;

    if (baseCount !== 1) {
        throw new Error("Exactly one base price configuration is required");
    }

    Object.entries(priceConfig).forEach(([key, config]) => {
        if (!config.availableOptions?.length) {
            throw new Error(
                `Price configuration '${key}' must have available options`,
            );
        }
    });
}

export function validateAttributes(attributes: Attribute[]) {
    attributes.forEach((attr) => {
        if (!attr.availableOptions.includes(attr.defaultValue)) {
            throw new Error(
                `defaultValue must be one of availableOptions for ${attr.name}`,
            );
        }

        if (
            attr.widgetType === "switch" &&
            attr.availableOptions.length !== 2
        ) {
            throw new Error(
                `Switch attribute '${attr.name}' must have exactly 2 options`,
            );
        }
    });
}
