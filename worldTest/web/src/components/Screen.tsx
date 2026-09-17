import type { ReactNode } from 'react';

export function Screen({ title, children }: { title?: string; children: ReactNode }) {
    return (
        <div className="screen">
            {title ? <div className="section-title">{title}</div> : null}
            {children}
        </div>
    );
}
