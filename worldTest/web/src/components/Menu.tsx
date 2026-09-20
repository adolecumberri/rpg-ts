export type MenuOption = {
    label: string;
    sub?: string;
    // Extra muted text shown under the label (newlines allowed).
    description?: string;
    icon?: string;
    disabled?: boolean;
    onClick: () => void;
};

export function Menu({ options }: { options: MenuOption[] }) {
    return (
        <div className="menu">
            {options.map((option, index) => (
                <button
                    key={index}
                    className="menu-item"
                    disabled={option.disabled}
                    onClick={option.onClick}
                >
                    {option.icon ? <span className="menu-icon">{option.icon}</span> : null}
                    <span className="menu-body">
                        <span className="menu-label">{option.label}</span>
                        {option.description ? <span className="menu-desc">{option.description}</span> : null}
                    </span>
                    {option.sub ? <span className="menu-sub">{option.sub}</span> : null}
                </button>
            ))}
        </div>
    );
}

export function MenuSection({
    title,
    icon,
    options,
}: {
    title: string;
    icon?: string;
    options: MenuOption[];
}) {
    if (options.length === 0) return null;

    return (
        <div>
            <div className="section-title">{icon ? `${icon} ${title}` : title}</div>
            <Menu options={options} />
        </div>
    );
}
