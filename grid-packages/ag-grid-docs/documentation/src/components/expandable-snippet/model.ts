import { getJsonFromFile } from "../documentation-helpers";
import useJsonFileNodes from "../use-json-file-nodes";

type MetaRecord = {
    description?: string;
    type?: string;
    isRequired?: boolean;
    default: any;
    min?: number;
    max?: number;
    unit?: string;
    options?: string[];
    suggestions?: string[];
};

export type InterfaceLookup = Record<
    string,
    {
        meta: {
            isTypeAlias?: boolean;
        };
        docs: Record<string, string>;
        type: Record<string, string> | string;
    }
>;

export type CodeLookup = Record<
    string,
    Record<
        string,
        {
            description: string;
            type: {
                arguments?: Record<string, string>;
                returnType: string;
                optional: boolean;
            };
        }
    >
>;

type Overrides = {
    _config_: {};
    [key: string]: Record<string, MetaRecord>;
};

type JsonPrimitiveProperty = {
    type: "primitive";
    tsType: string;
    aliasType?: string;
};

type JsonObjectProperty = {
    type: "nested-object";
    tsType: string;
    model: JsonModel;
};

type JsonArray = {
    type: "array";
    depth: number;
    elements: Exclude<JsonProperty, JsonArray>;
};

export type JsonUnionType = {
    type: "union";
    tsType: string;
    options: JsonObjectProperty[];
};

export type JsonProperty = JsonPrimitiveProperty | JsonObjectProperty | JsonArray | JsonUnionType;

export interface JsonModel {
    type: "model";
    tsType: string;
    properties: Record<string, {
        deprecated: boolean;
        required: boolean;
        documentation?: string;
        desc: JsonProperty;
    }>;
}

export function buildModel(
    type: string,
    interfaceLookup: InterfaceLookup,
    codeLookup: CodeLookup
): JsonModel {
    const iLookup = interfaceLookup[type];
    const cLookup = codeLookup[type];

    const result: JsonModel = { type: "model", tsType: type, properties: {} };

    if (iLookup == null || cLookup == null) {
        return result;
    }

    Object.entries(cLookup).forEach(([prop, propCLookup]) => {
        if (prop === "meta") {
            return;
        }

        const { meta, docs } = iLookup;
        const metaProp = meta?.[prop] || meta?.[prop + '?'] || {};
        const docsProp = docs?.[prop] || docs?.[prop + '?'];
        const { description, type } = propCLookup;
        const { optional, returnType } = type || {
            optional: false,
            returnType: "unknown",
        };
        const documentation = description || docsProp;
        const { isRequired } = metaProp;

        const required = optional === false || isRequired === true;
        const deprecated = docsProp?.indexOf("@deprecated") >= 0;

        const declaredType: string = meta[prop]?.type || returnType;
        result.properties[prop] = {
            deprecated,
            required,
            documentation,
            desc: resolveType(declaredType, interfaceLookup, codeLookup),
        };
    });

    return result;
}

const primitiveTypes = ["number", "string", "Date", "boolean", "any"];
type PropertyClass = "primitive" | "nested-object" | "union-nested-object" | "alias" | "unknown";

function resolveType(
    declaredType: string,
    interfaceLookup: InterfaceLookup,
    codeLookup: CodeLookup
): JsonProperty {
    const pType = plainType(declaredType);
    const wrapping = typeWrapping(declaredType);
    if (wrapping === "array") {
        return {
            type: "array",
            depth: declaredType.match(/\[/).length,
            elements: resolveType(pType, interfaceLookup, codeLookup) as Exclude<
                JsonProperty,
                JsonArray
            >,
        };
    }

    const { resolvedClass, resolvedType } = typeClass(declaredType, interfaceLookup, codeLookup);
    switch (resolvedClass) {
        case "primitive":
        case "unknown":
            return { type: "primitive", tsType: resolvedType };
        case "alias":
            return resolveType(resolvedType, interfaceLookup, codeLookup);
        case "union-nested-object":
            return {
                type: "union",
                tsType: resolvedType,
                options: resolvedType.split("|").map(unionType => ({
                    type: "nested-object",
                    model: buildModel(unionType.trim(), interfaceLookup, codeLookup),
                    tsType: unionType.trim(),
                })),
            };
        case "nested-object":
            return {
                type: "nested-object",
                model: buildModel(resolvedType, interfaceLookup, codeLookup),
                tsType: resolvedType.trim(),
            };
    }
}

function plainType(type: string): string {
    return type.replace(/[\[\]\?\!]/g, "");
}

function typeClass(
    type: string,
    interfaceLookup: InterfaceLookup,
    codeLookup: CodeLookup
): { resolvedClass: PropertyClass; resolvedType: string } {
    const pType = plainType(type);

    if (primitiveTypes.includes(pType)) {
        return { resolvedClass: "primitive", resolvedType: type };
    }

    if (pType.indexOf("|") >= 0) {
        const firstUnionItemClass = typeClass(
            pType.split("|")[0].trim(),
            interfaceLookup,
            codeLookup
        );
        switch (firstUnionItemClass.resolvedClass) {
            case "alias":
                return { resolvedClass: "unknown", resolvedType: type };
            case "primitive":
                return { resolvedClass: "primitive", resolvedType: type };
            case "nested-object":
                return { resolvedClass: "union-nested-object", resolvedType: type };
        }
    }

    if (pType.startsWith("'")) {
        return { resolvedClass: "primitive", resolvedType: type };
    }

    const iLookup = interfaceLookup[pType];
    // const cLookup = codeLookup[pType];
    if (iLookup == null) {
        return { resolvedClass: "unknown", resolvedType: type };
    }

    if (iLookup.meta.isTypeAlias) {
        if (typeof iLookup.type === "string") {
            return typeClass(iLookup.type, interfaceLookup, codeLookup);
        }

        return { resolvedClass: "alias", resolvedType: type };
    }

    return { resolvedClass: "nested-object", resolvedType: type };
}

type Wrapping = "none" | "array";
function typeWrapping(type: string): Wrapping {
    if (type.endsWith("]")) {
        return "array";
    }

    return "none";
}

export function loadLookups(overridesrc?: string): { interfaceLookup; codeLookup } {
    const interfaceLookup: InterfaceLookup = getJsonFromFile(
        useJsonFileNodes(),
        undefined,
        "grid-api/interfaces.AUTO.json"
    );
    const codeLookup: CodeLookup = getJsonFromFile(
        useJsonFileNodes(),
        undefined,
        "grid-api/doc-interfaces.AUTO.json"
    );

    if (overridesrc) {
        const overrides: Overrides = getJsonFromFile(useJsonFileNodes(), undefined, overridesrc);

        Object.entries(overrides).forEach(([type, override]) => {
            const def = interfaceLookup[type];

            Object.entries(override).forEach(([prop, propOverride]) => {
                def.meta[prop] = {
                    ...def.meta[prop],
                    ...propOverride,
                };
                def.docs[prop] = propOverride.description || def.docs[prop];
                def.type[prop] = propOverride.type || def.type[prop];
            });
        });
    }

    return { interfaceLookup, codeLookup };
}
