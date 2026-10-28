import { forwardRef, type ButtonHTMLAttributes, type HTMLAttributes, type ReactNode } from "react";
import { clsx } from "clsx";

export function Container({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={clsx("site-container", className)}>{children}</div>;
}

export const Section = forwardRef<HTMLElement, HTMLAttributes<HTMLElement>>(function Section({ children, className, ...props }, ref) {
  return <section ref={ref} className={clsx("section", className)} {...props}>{children}</section>;
});

export function SectionHeading({ eyebrow, title, copy, light = false }: { eyebrow: string; title: string; copy: string; light?: boolean }) {
  return (
    <div className={clsx("section-heading", light && "dark-section")}>
      <span className="section-kicker">{eyebrow}</span>
      <h2 className="section-title">{title}</h2>
      <p className="section-copy">{copy}</p>
    </div>
  );
}

export function Button({ children, className, variant = "gold", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "gold" | "outline" | "ghost" }) {
  return <button className={clsx("btn", `btn-${variant}`, className)} {...props}>{children}</button>;
}
