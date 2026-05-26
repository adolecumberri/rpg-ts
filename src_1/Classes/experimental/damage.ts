export type DamageMultiplier = number; // 1 = 100%, 0.4 = 40%, 1.25 = 125%
export interface AttackTypeDefinition {
    id: string;
    name: string;
    description?: string;
    // Multiplicadores hacia distintos tipos de defensa
    vsDefence: Partial<Record<string, DamageMultiplier>>;
  }

export interface DefenceTypeDefinition {
    id: string;
    name: string;
    description?: string;
  }
export const attackTypeRegistry = new Map<string, AttackTypeDefinition>();
export const defenceTypeRegistry = new Map<string, DefenceTypeDefinition>();

export function getDamageMultiplier(attackType: string, defenceType: string): number {
    const attack = attackTypeRegistry.get(attackType);
    if (!attack) throw new Error(`Unknown attack type: ${attackType}`);

    return attack.vsDefence?.[defenceType] ?? 1;
}
