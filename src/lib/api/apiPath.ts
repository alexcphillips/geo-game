/** The `:name` params in a path, e.g. "runId" from "/geo/runs/:runId/flee". */
type ParamsOf<Path extends string> = Path extends `${string}:${infer Name}/${infer Rest}`
    ? Name | ParamsOf<`/${Rest}`>
    : Path extends `${string}:${infer Name}`
      ? Name
      : never;

/**
 * Fills a `GEO_API_PATHS` template's `:params`, each URL-encoded. The params
 * are read from the template's type, so a missing or misspelled one is a type
 * error: `apiPath(GEO_API_PATHS.runs.flee, { runId })`.
 */
export function apiPath<Path extends string>(template: Path, params: Record<ParamsOf<Path>, string | number>): string {
    return template.replace(/:(\w+)/g, (_, name: string) => {
        const value = (params as Record<string, string | number | undefined>)[name];
        if (value === undefined) throw new Error(`apiPath: no "${name}" for ${template}`);
        return encodeURIComponent(String(value));
    });
}
