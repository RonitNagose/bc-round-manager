import type { ReactNode } from "react";

export default function BidButton({
  disabled,
  onClick,
  children,
}: {
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button className="button button-primary" type="button" disabled={disabled} onClick={onClick}>
      {children}
    </button>
  );
}
