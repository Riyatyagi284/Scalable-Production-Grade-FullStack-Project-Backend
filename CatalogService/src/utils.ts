export function mapToObject(map: Map<string, any>) {
    const obj: { [key: string]: number | string } = {};

    for (const [key, value] of map) {
        obj[key] = value instanceof Map ? mapToObject(value) : value;
    }

    return obj;
}
