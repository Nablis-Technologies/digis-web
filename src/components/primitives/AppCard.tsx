import type { ComponentProps, ReactNode } from "react";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/**
 * Structural card wrapper. `unstyled` keeps all visual decisions at the
 * call site; className is passed straight through after the primitive base.
 */
export function AppCard({ className = "", children, ...props }: ComponentProps<typeof Card>) {
  return <Card unstyled className={className} {...props}>{children}</Card>;
}

export function AppCardHeader(props: ComponentProps<typeof CardHeader>) { return <CardHeader {...props} />; }
export function AppCardContent(props: ComponentProps<typeof CardContent>) { return <CardContent {...props} />; }
export function AppCardFooter(props: ComponentProps<typeof CardFooter>) { return <CardFooter {...props} />; }
export function AppCardTitle(props: ComponentProps<typeof CardTitle>) { return <CardTitle {...props} />; }
export function AppCardDescription(props: ComponentProps<typeof CardDescription>) { return <CardDescription {...props} />; }
export function AppCardAction(props: ComponentProps<typeof CardAction>) { return <CardAction {...props} />; }
