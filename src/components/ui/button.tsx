import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "@/lib/utils";

const buttonStyles = {
  primary:
    "bg-cyan-300 text-slate-950 shadow-[0_8px_20px_rgba(34,211,238,0.16)] hover:bg-cyan-200",
  secondary:
    "border border-white/10 bg-white/[0.06] text-white hover:border-cyan-300/40 hover:bg-white/10",
  ghost: "text-slate-300 hover:bg-white/[0.08] hover:text-white",
};

const sizeStyles = {
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-6 text-base",
};

type SharedProps = {
  children: ReactNode;
  variant?: keyof typeof buttonStyles;
  size?: keyof typeof sizeStyles;
  className?: string;
};

type ButtonAsButtonProps = SharedProps & ComponentPropsWithoutRef<"button">;

type ButtonAsAnchorProps = SharedProps &
  Omit<ComponentPropsWithoutRef<"a">, "className"> & {
    href: string;
    external: true;
  };

type ButtonAsLinkProps = SharedProps &
  Omit<ComponentPropsWithoutRef<typeof Link>, "className"> & {
    href: string;
    external?: false;
  };

function getButtonClassName({
  variant = "primary",
  size = "md",
  className,
}: Pick<SharedProps, "variant" | "size" | "className">) {
  return cn(
    "inline-flex items-center justify-center rounded-full font-medium transition-colors duration-150",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950",
    buttonStyles[variant],
    sizeStyles[size],
    className,
  );
}

export function Button(props: ButtonAsButtonProps | ButtonAsLinkProps | ButtonAsAnchorProps) {
  if ("href" in props) {
    const { children, variant, size, className, href, external, ...rest } = props;

    if (external) {
      return (
        <a
          href={href}
          className={getButtonClassName({ variant, size, className })}
          {...rest}
        >
          {children}
        </a>
      );
    }

    return (
      <Link
        href={href}
        className={getButtonClassName({ variant, size, className })}
        {...rest}
      >
        {children}
      </Link>
    );
  }

  const { children, variant, size, className, type = "button", ...rest } = props;

  return (
    <button type={type} className={getButtonClassName({ variant, size, className })} {...rest}>
      {children}
    </button>
  );
}
