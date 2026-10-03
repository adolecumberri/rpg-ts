import { useEffect, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';

// The live modal stack: each open modal gets the next layer number, so
// stacked modals shift slightly instead of perfectly covering each
// other. Module-level so every Modal in the app shares the same stack.
let modalStackCount = 0;

/**
 * The pixel-art modal: an overlay plus a centered panel with a title
 * bar and a close button. Content is passed as children; the component
 * renders nothing while `open` is false. Every modal opened over an
 * already-open one is shifted by one step (see .pixel-modal), so a
 * menu + tooltip + dialog remain all three visible at once.
 */
export function Modal({
    title,
    open,
    onClose,
    children,
    size = 'default',
    closable = true,
    header,
    centered = false,
}: {
    title: string;
    open: boolean;
    onClose: () => void;
    children: ReactNode;
    // 'lg' fills almost the whole canvas (tall lists like the inventory).
    size?: 'default' | 'lg';
    // Shows the ✕ close button (screens with their own cancel/back can
    // hide it).
    closable?: boolean;
    // Extra content rendered inside the header, next to the title
    // (the item picker puts its tabs there).
    header?: ReactNode;
    // Centers the modal on the canvas and stretches it to 100% width.
    centered?: boolean;
}) {
    const [layer, setLayer] = useState(0);

    useEffect(() => {
        if (!open) return;
        modalStackCount += 1;
        setLayer(modalStackCount);
        return () => {
            modalStackCount -= 1;
        };
    }, [open]);

    if (!open) return null;

    const style = { '--modal-layer': layer } as CSSProperties;

    return (
        <>
            <div className="pixel-modal-overlay" style={style} onClick={onClose} />
            <div
                className={[
                    'pixel-modal',
                    size === 'lg' ? 'pixel-modal--lg' : '',
                    centered ? 'pixel-modal--center' : '',
                ].join(' ')}
                style={style}
                role="dialog"
                aria-label={title}
            >
                <div className="pixel-modal-header">
                    <span className="pixel-modal-title">{title}</span>
                    {header}
                    {closable ? (
                        <button
                            type="button"
                            className="pixel-modal-close"
                            aria-label="Close"
                            onClick={onClose}
                        >
                            ✕
                        </button>
                    ) : null}
                </div>
                <div className="pixel-modal-body">{children}</div>
            </div>
        </>
    );
}
