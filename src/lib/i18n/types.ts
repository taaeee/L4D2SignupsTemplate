export type Language = "es" | "en";

export interface TranslationParams {
  [key: string]: string | number | undefined | null;
}

export type TranslationDictionary = {
  [key: string]: any;
};
