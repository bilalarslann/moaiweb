declare module 'xml2js' {
    export interface ParserOptions {
        explicitArray?: boolean;
        mergeAttrs?: boolean;
        normalize?: boolean;
        normalizeTags?: boolean;
        trim?: boolean;
        attrkey?: string;
        charkey?: string;
        explicitCharkey?: boolean;
        explicitRoot?: boolean;
        emptyTag?: any;
    }

    export function parseString(
        xml: string,
        callback: (err: Error | null, result: any) => void
    ): void;
    export function parseString(
        xml: string,
        options: ParserOptions,
        callback: (err: Error | null, result: any) => void
    ): void;

    export class Parser {
        constructor(options?: ParserOptions);
        parseString(
            xml: string,
            callback: (err: Error | null, result: any) => void
        ): void;
    }

    export const defaults: {
        preserveChildrenOrder: boolean;
        charsAsChildren: boolean;
        includeWhiteChars: boolean;
        async: boolean;
        strict: boolean;
        attrkey: string;
        charkey: string;
        explicitCharkey: boolean;
        explicitArray: boolean;
        ignoreAttrs: boolean;
        mergeAttrs: boolean;
        explicitRoot: boolean;
        trim: boolean;
        normalizeTags: boolean;
        normalize: boolean;
        explicitChildren: boolean;
        charsAsChildren: boolean;
        includeWhiteChars: boolean;
        async: boolean;
        strict: boolean;
    };
} 