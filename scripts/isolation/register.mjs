import { registerHooks } from "node:module";

const replacements = {
  "@clerk/nextjs/server": new URL("./fake-clerk-server.mjs", import.meta.url).href,
  "server-only": new URL("./empty.mjs", import.meta.url).href,
};

registerHooks({
  resolve(specifier, context, nextResolve) {
    const url = replacements[specifier];
    return url ? { url, shortCircuit: true } : nextResolve(specifier, context);
  },
});
