import type { NextConfig } from "next";
import createMDX from "@next/mdx";

const nextConfig: NextConfig = {
  // Blog yazıları .mdx; sayfa uzantılarına eklenmezse rota çözülmüyor.
  pageExtensions: ["ts", "tsx", "mdx"],
};

/*
 * MDX için @next/mdx: Next ile birlikte sürülüyor, sürüm yükseltmelerinde
 * kırılma riski üçüncü parti derleyicilere göre düşük.
 *
 * Eklenti listesi bilerek boş — remark/rehype eklentileri Turbopack'te
 * serileştirilebilir olmak zorunda ve her biri ayrı bir bağımlılık. İhtiyaç
 * doğmadan eklenmiyor.
 */
const withMDX = createMDX({});

export default withMDX(nextConfig);
