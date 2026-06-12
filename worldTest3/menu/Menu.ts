import * as readline from "readline";

export type MenuChoice = {
    label: string;
    execute: () => Promise<boolean>;
    isDisabled?: boolean;
};

export class Menu {
    inputInitialized = false;

    selectMenuOption = async (header: string, options: MenuChoice[]): Promise<number> => {
        return new Promise((resolve) => {
            this.ensureInputReady();
            let selected = 0;

            const render = () => {
                console.clear();
                process.stdout.write(`${header}\n\n`);
                options.forEach((option, index) => {
                    const pointer = index === selected ? ">" : " ";
                    const label = option.isDisabled ? `${option.label} (Disabled)` : option.label;
                    process.stdout.write(`${pointer} ${option.isDisabled ? "" : index + 1 + "."} ${label}\n`);
                });
                process.stdout.write("\nUse Arrow Up/Down + Enter, or press a number.\n");
            };

            const cleanup = () => {
                process.stdin.removeListener("keypress", onKeyPress);
            };

            const onKeyPress = (str: string, key: { name?: string; sequence?: string; ctrl?: boolean }) => {
                if (key.ctrl && key.name === "c") {
                    cleanup();
                    this.cleanupInput();
                    process.exit(0);
                }

                if (key.name === "up") {
                    selected = selected <= 0 ? options.length - 1 : selected - 1;
                    render();
                    return;
                }

                if (key.name === "down") {
                    selected = selected >= options.length - 1 ? 0 : selected + 1;
                    render();
                    return;
                }

                if (key.name === "return") {
                    cleanup();
                    resolve(selected);
                    return;
                }

                const keyText = key.sequence ?? str;
                if (/^[1-9]$/.test(keyText)) {
                    const numeric = Number(keyText) - 1;
                    if (numeric >= 0 && numeric < options.length) {
                        cleanup();
                        resolve(numeric);
                    }
                }
            };

            process.stdin.on("keypress", onKeyPress);
            render();
        });
    };

    waitForAnyKey = async (message: string): Promise<void> => {
        this.ensureInputReady();
        process.stdout.write(`\n${message}\n`);

        await new Promise<void>((resolve) => {
            const done = () => {
                process.stdin.removeListener("keypress", onKeyPress);
                resolve();
            };

            const onKeyPress = (_str: string, key: { ctrl?: boolean; name?: string }) => {
                if (key.ctrl && key.name === "c") {
                    this.cleanupInput();
                    process.exit(0);
                }
                done();
            };

            process.stdin.on("keypress", onKeyPress);
        });
    };

    ensureInputReady = (): void => {
        if (this.inputInitialized) return;

        readline.emitKeypressEvents(process.stdin);
        if (process.stdin.isTTY) {
            process.stdin.setRawMode(true);
        }
        process.stdin.resume();
        this.inputInitialized = true;
    };

    cleanupInput = (): void => {
        if (!this.inputInitialized) return;

        if (process.stdin.isTTY) {
            process.stdin.setRawMode(false);
        }
        process.stdin.pause();
        this.inputInitialized = false;
    };
}
