import { JsonValue } from './cfgGameplay';

// profiles/BRDK_MODS/Arts/MainArts.json — общие настройки крафта/распада отдельно от списка
// артефактов (AllArtsList, у каждого свои эффекты + списки агентов/ингредиентов) и легенды
// агентов заражения (AgentsDiscription — строки "id|Название").
export interface AgentDescription {
    id: string;
    name: string;
}

export const parseAgentsDiscription = (raw: string[]): AgentDescription[] =>
    raw.map((line) => {
        const [id, name] = line.split('|');
        return { id: id ?? '', name: name ?? '' };
    });

export const serializeAgentsDiscription = (items: AgentDescription[]): string[] => items.map((i) => `${i.id}|${i.name}`);

export const emptyAgentDescription = (): AgentDescription => ({ id: '0', name: 'NewAgent' });

export interface ArtDefinition {
    ArtName: string;
    ContainerDecay: number;
    BeltDecay: number;
    CargoDecay: number;
    GroundDecay: number;
    DischargeCoef: number;
    ReducedEfficiency: number;
    HPAdd: number;
    HPAddLegs: number;
    BloodAdd: number;
    ShockAdd: number;
    StaminaAdd: number;
    AddWater: number;
    AddFood: number;
    TempValue: number;
    WeaknessPower: number;
    BleedChance: number;
    WeightCoef: number;
    RecoilCoef: number;
    SwayCoef: number;
    ArtAgents: string[];
    CraftTimer: number;
    ArtIngridients: string[];
    [key: string]: JsonValue;
}

export const emptyArtDefinition = (): ArtDefinition => ({
    ArtName: 'NewArt',
    ContainerDecay: 0,
    BeltDecay: 10,
    CargoDecay: 70,
    GroundDecay: 30,
    DischargeCoef: 0.75,
    ReducedEfficiency: 0.2,
    HPAdd: 0,
    HPAddLegs: 0,
    BloodAdd: 0,
    ShockAdd: 0,
    StaminaAdd: 0,
    AddWater: 0,
    AddFood: 0,
    TempValue: 0,
    WeaknessPower: 0,
    BleedChance: 0,
    WeightCoef: 0.2,
    RecoilCoef: 0.2,
    SwayCoef: 1,
    ArtAgents: [],
    CraftTimer: -1,
    ArtIngridients: [],
});
