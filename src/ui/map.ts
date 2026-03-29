import {
  ContainerBuilder,
  TextDisplayBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import { starEmoji, formatStarType } from "./common.js";

interface MapSystem {
  id: number;
  name: string;
  starType: string;
  distance: number;
  resourceRating: number;
  isHub: boolean;
  isCurrent: boolean;
}

export function starMapDisplay(
  currentSystemName: string,
  nearbySystems: MapSystem[]
): ContainerBuilder[] {
  const containers: ContainerBuilder[] = [];

  // Header
  const header = new ContainerBuilder()
    .setAccentColor(0x1a1a2e)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `\ud83d\uddfa\ufe0f **Star Map** \u2014 Current Location: **${currentSystemName}**`
      )
    );
  containers.push(header);

  if (nearbySystems.length === 0) {
    containers.push(
      new ContainerBuilder()
        .setAccentColor(0x808080)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            "No other enrolled systems found nearby. The galaxy awaits exploration..."
          )
        )
    );
    return containers;
  }

  // System entries
  for (const sys of nearbySystems) {
    const emoji = starEmoji(sys.starType);
    const typeStr = formatStarType(sys.starType);
    const distStr = sys.distance.toFixed(1);

    const container = new ContainerBuilder()
      .setAccentColor(sys.isHub ? 0xffd700 : 0x334455)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `${emoji} **${sys.name}**${sys.isHub ? " \ud83c\udfe0 Hub" : ""}${sys.isCurrent ? " \ud83d\udccd You are here" : ""}\n` +
          `${typeStr} \u2022 ${distStr} LY \u2022 Resources: ${sys.resourceRating}/10`
        )
      );

    if (!sys.isCurrent) {
      container.addActionRowComponents(
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId(`travel_start:${sys.id}`)
            .setLabel(`Travel (${distStr} LY)`)
            .setStyle(ButtonStyle.Primary)
        )
      );
    }

    containers.push(container);
  }

  return containers;
}
