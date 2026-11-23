// Web uygulamasının saf TypeScript dosyalarını (src/lib) KOPYALAMADAN paylaşır:
// şemalar, sabitler, biçimlendirme, hata çevirisi, vertical sözlüğü.
// Next'e bağlı dosyalar (auth.ts, queries.ts, supabase/*) paylaşılmaz.
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const sharedLib = path.resolve(projectRoot, "../src/lib");

const config = getDefaultConfig(projectRoot);
config.watchFolders = [...(config.watchFolders ?? []), sharedLib];

const defaultResolve = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const resolve = defaultResolve ?? context.resolveRequest;

  // "@/lib/x" → ../src/lib/x (web ile aynı takma ad).
  if (moduleName.startsWith("@/lib/")) {
    return resolve(context, path.join(sharedLib, moduleName.slice("@/lib/".length)), platform);
  }

  // Paylaşılan dosyalar zod/date-fns'i web'in node_modules'ünden değil, mobilin
  // kopyasından alır: tek kopya, ikinci sürüm paketlenmez.
  if (
    context.originModulePath.startsWith(sharedLib) &&
    /^(zod|date-fns)(\/|$)/.test(moduleName)
  ) {
    return resolve(
      { ...context, originModulePath: path.join(projectRoot, "package.json") },
      moduleName,
      platform,
    );
  }

  return resolve(context, moduleName, platform);
};

module.exports = config;
