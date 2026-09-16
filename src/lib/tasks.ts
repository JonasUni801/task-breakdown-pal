export type Step = {
  text: string;
  /** Ja/Nein-Frage, z. B. "Ist alles da?" */
  ask?: string;
  /** Unterschritte, die bei "Nein" eingeschoben werden */
  ifNo?: string[];
};

export type Task = {
  id: string;
  title: string;
  steps: (string | Step)[];
};

export function toStep(s: string | Step): Step {
  return typeof s === "string" ? { text: s } : s;
}

export const tasks: Task[] = [
  {
    id: "kuchen",
    title: "Kuchen backen",
    steps: [
      {
        text: "Schauen Sie in den Schrank. Haben Sie Mehl, Zucker, Butter und Eier?",
        ask: "Ist alles da?",
        ifNo: [
          "Schreiben Sie auf einen Zettel, was fehlt.",
          "Ziehen Sie Jacke und Schuhe an.",
          "Nehmen Sie Zettel, Geldbeutel und Schlüssel mit.",
          "Gehen Sie in den Laden und kaufen Sie, was auf dem Zettel steht.",
          "Gehen Sie nach Hause und legen Sie alles auf den Tisch.",
        ],
      },
      "Stellen Sie den Backofen auf 180 Grad.",
      "Geben Sie Butter und Zucker in eine große Schüssel und rühren Sie um.",
      "Schlagen Sie die Eier dazu und rühren Sie weiter.",
      "Geben Sie das Mehl dazu und rühren Sie, bis der Teig glatt ist.",
      "Füllen Sie den Teig in die Backform.",
      "Stellen Sie die Form in den Ofen.",
      "Stellen Sie einen Wecker auf 45 Minuten.",
      "Nehmen Sie den Kuchen heraus. Fertig!",
    ],
  },
  {
    id: "tee",
    title: "Tee kochen",
    steps: [
      "Füllen Sie den Wasserkocher mit Wasser.",
      "Schalten Sie den Wasserkocher ein.",
      "Stellen Sie eine Tasse auf den Tisch.",
      "Legen Sie einen Teebeutel in die Tasse.",
      "Gießen Sie das heiße Wasser in die Tasse.",
      "Warten Sie 5 Minuten.",
      "Nehmen Sie den Teebeutel heraus. Fertig!",
    ],
  },
  {
    id: "fruehstueck",
    title: "Frühstück machen",
    steps: [
      "Nehmen Sie einen Teller aus dem Schrank.",
      "Holen Sie Brot, Butter und Marmelade.",
      "Legen Sie eine Scheibe Brot auf den Teller.",
      "Streichen Sie Butter auf das Brot.",
      "Streichen Sie Marmelade darauf.",
      "Setzen Sie sich hin und essen Sie in Ruhe. Fertig!",
    ],
  },
];
