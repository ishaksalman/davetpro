import type { MDXComponents } from "mdx/types";

/**
 * MDX çıktısının tipografisi.
 *
 * Yazılar ham HTML etiketi üretiyor; sınıf verilmezse tanıtım sayfasının
 * paletiyle uyuşmayan tarayıcı varsayılanlarıyla çiziliyorlar. Tailwind
 * tipografi eklentisi yerine elle: tek bir dosya, ek bağımlılık yok.
 */
export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    h2: (props) => (
      <h2
        className="mk-title mt-12 mb-4 text-[1.5rem] text-mk-ink first:mt-0"
        {...props}
      />
    ),
    h3: (props) => (
      <h3
        className="mt-8 mb-3 text-[1.1875rem] font-semibold tracking-tight text-mk-ink"
        {...props}
      />
    ),
    p: (props) => (
      <p className="mt-4 text-[1.0625rem] leading-[1.75] text-mk-body" {...props} />
    ),
    ul: (props) => (
      <ul
        className="mt-4 list-disc space-y-2 pl-5 text-[1.0625rem] leading-[1.75] text-mk-body"
        {...props}
      />
    ),
    ol: (props) => (
      <ol
        className="mt-4 list-decimal space-y-2 pl-5 text-[1.0625rem] leading-[1.75] text-mk-body"
        {...props}
      />
    ),
    strong: (props) => <strong className="font-semibold text-mk-ink" {...props} />,
    a: (props) => (
      <a className="text-mk-ink underline underline-offset-4" {...props} />
    ),
    // Formül kutusu. Dar ekranda taşmasın diye kendi içinde kayıyor.
    pre: (props) => (
      <pre
        className="mt-6 overflow-x-auto rounded-xl bg-mk-soft px-5 py-4 text-[0.9375rem] leading-relaxed text-mk-ink"
        {...props}
      />
    ),
    code: (props) => <code className="font-mono" {...props} />,
    table: (props) => (
      <div className="mt-6 overflow-x-auto">
        <table className="w-full border-collapse text-left text-[0.9375rem]" {...props} />
      </div>
    ),
    th: (props) => (
      <th
        className="border-b border-mk-line py-2.5 pr-4 font-semibold text-mk-ink"
        {...props}
      />
    ),
    td: (props) => (
      <td className="border-b border-mk-line py-2.5 pr-4 text-mk-body" {...props} />
    ),
    blockquote: (props) => (
      <blockquote
        className="mt-6 border-l-2 border-mk-line pl-5 text-[1.0625rem] leading-[1.75] text-mk-body italic"
        {...props}
      />
    ),
    ...components,
  };
}
