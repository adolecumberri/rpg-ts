export type MenuOption = {
    label: string;
    sub?: string;
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
                    <span className="menu-label">{option.label}</span>
                    {option.sub ? <span className="menu-sub">{option.sub}</span> : null}
                </button>
            ))}
        </div>
    );
}
