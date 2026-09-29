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
 * remark-gfm tablo ve şerit üstü metin için. Turbopack eklentileri paket ADI
 * olarak istiyor (fonksiyon referansı serileştirilemiyor), o yüzden dizi
 * biçiminde veriliyor.
 */
const withMDX = createMDX({
  options: {
    remarkPlugins: [["remark-gfm", {}]],
  },
});

export default withMDX(nextConfig);
