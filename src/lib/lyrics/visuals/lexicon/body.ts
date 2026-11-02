import { VisualConcept } from '../types';

export const BODY_LEXICON: VisualConcept[] = [
  {
    "id": "crimson_blood",
    "words": [
      "crimson",
      "blood",
      "bleeding",
      "bleeds",
      "bleed",
      "bloody",
      "vein",
      "veins",
      "pulse",
      "pulses",
      "bloodstream",
      "gore"
    ],
    "phrases": [
      "crimson tide",
      "flesh and blood"
    ],
    "category": "body",
    "imageId": "crimson",
    "weight": 9,
    "intensity": "intense",
    "effectId": "heartbeat"
  },
  {
    "id": "silhouette_shadow",
    "words": [
      "silhouette",
      "silhouettes",
      "shadow",
      "shadows",
      "shadowy",
      "outline",
      "figure",
      "profile",
      "dark shape"
    ],
    "phrases": [
      "dancing shadows",
      "dark silhouette"
    ],
    "category": "body",
    "imageId": "silhouette",
    "weight": 8,
    "intensity": "normal",
    "effectId": "moon"
  },
  {
    "id": "paranoia_watcher",
    "words": [
      "paranoia",
      "paranoid",
      "watcher",
      "watchers",
      "watching",
      "watched",
      "gaze",
      "gazes",
      "stare",
      "staring",
      "unseen eyes"
    ],
    "phrases": [
      "the watcher",
      "always watching"
    ],
    "category": "body",
    "imageId": "paranoia",
    "weight": 8,
    "intensity": "intense",
    "contextCues": {
      "requires": [
        "eye",
        "watch",
        "stare",
        "look",
        "see"
      ]
    },
    "effectId": "eye"
  },
  {
    "id": "eyes_vision",
    "words": [
      "eye",
      "eyes",
      "pupil",
      "pupils",
      "iris",
      "sight",
      "vision",
      "glance",
      "peep",
      "blink",
      "blinking",
      "eyelash"
    ],
    "phrases": [
      "look into my eyes",
      "in your eyes"
    ],
    "category": "body",
    "imageId": "paranoia",
    "weight": 7,
    "intensity": "normal",
    "contextCues": {
      "excludes": [
        "needle"
      ]
    },
    "effectId": "eye"
  },
  {
    "id": "heart_organ",
    "words": [
      "heart",
      "hearts",
      "heartbeat",
      "heartbeats",
      "cardiac",
      "chest",
      "ribs",
      "breast"
    ],
    "phrases": [
      "heavy heart",
      "racing heart",
      "heart attack"
    ],
    "category": "body",
    "imageId": "heart",
    "weight": 8,
    "intensity": "normal",
    "effectId": "heartbeat"
  },
  {
    "id": "lips_kiss",
    "words": [
      "lip",
      "lips",
      "kiss",
      "kisses",
      "kissing",
      "kissed",
      "mouth",
      "smile",
      "smiling",
      "smiles",
      "grin"
    ],
    "phrases": [
      "soft lips",
      "stolen kiss"
    ],
    "category": "body",
    "imageId": "heart",
    "weight": 7,
    "intensity": "normal",
    "effectId": "love"
  },
  {
    "id": "hands_touch",
    "words": [
      "hand",
      "hands",
      "palm",
      "palms",
      "finger",
      "fingers",
      "fingertip",
      "fingertips",
      "clasp",
      "embrace",
      "touch",
      "touching"
    ],
    "phrases": [
      "hold my hand",
      "in your hands"
    ],
    "category": "body",
    "imageId": "halcyon",
    "weight": 6,
    "intensity": "normal"
  },
  {
    "id": "tears_crying",
    "words": [
      "tear",
      "tears",
      "teardrop",
      "teardrops",
      "cry",
      "cries",
      "crying",
      "weep",
      "weeping",
      "sob",
      "sobbing"
    ],
    "phrases": [
      "tears falling",
      "cry me a river"
    ],
    "category": "body",
    "imageId": "melancholy",
    "weight": 8,
    "intensity": "normal",
    "effectId": "rain"
  },
  {
    "id": "breath_lungs",
    "words": [
      "breath",
      "breathe",
      "breathing",
      "breathed",
      "exhale",
      "inhale",
      "gasp",
      "sigh",
      "sighs",
      "lungs",
      "air"
    ],
    "phrases": [
      "take my breath away",
      "last breath"
    ],
    "category": "body",
    "imageId": "halcyon",
    "weight": 7,
    "intensity": "normal"
  },
  {
    "id": "bones_skeleton",
    "words": [
      "bone",
      "bones",
      "skeleton",
      "skeletons",
      "skull",
      "skulls",
      "spine",
      "ribcage",
      "marrow"
    ],
    "phrases": [],
    "category": "body",
    "imageId": "poison",
    "weight": 8,
    "intensity": "intense",
    "effectId": "skull"
  },
  {
    "id": "wings_flight",
    "words": [
      "wing",
      "wings",
      "winged",
      "feather",
      "feathers",
      "plume",
      "flight",
      "soar",
      "soaring"
    ],
    "phrases": [
      "spread your wings",
      "broken wings"
    ],
    "category": "body",
    "imageId": "halo",
    "weight": 7,
    "intensity": "normal",
    "effectId": "shatter"
  },
  {
    "id": "voice_throat",
    "words": [
      "voice",
      "voices",
      "throat",
      "vocal",
      "whisper",
      "whispering",
      "shout",
      "shouting",
      "scream",
      "screaming"
    ],
    "phrases": [
      "whisper in the dark",
      "hear my voice"
    ],
    "category": "body",
    "imageId": "echo",
    "weight": 7,
    "intensity": "normal",
    "effectId": "scream"
  },
  {
    "id": "skin_flesh",
    "words": [
      "skin",
      "flesh",
      "complexion",
      "pores",
      "touch",
      "caress",
      "shiver",
      "goosebumps"
    ],
    "phrases": [
      "skin on skin",
      "under my skin"
    ],
    "category": "body",
    "imageId": "heart",
    "weight": 6,
    "intensity": "normal"
  },
  {
    "id": "body_term_1",
    "words": [
      "body_part_1",
      "sensory_aspect_1",
      "anatomy_1"
    ],
    "phrases": [],
    "category": "body",
    "imageId": "silhouette",
    "weight": 6,
    "intensity": "normal"
  },
  {
    "id": "body_term_2",
    "words": [
      "body_part_2",
      "sensory_aspect_2",
      "anatomy_2"
    ],
    "phrases": [],
    "category": "body",
    "imageId": "paranoia",
    "weight": 7,
    "intensity": "normal"
  },
  {
    "id": "body_term_3",
    "words": [
      "body_part_3",
      "sensory_aspect_3",
      "anatomy_3"
    ],
    "phrases": [],
    "category": "body",
    "imageId": "crimson",
    "weight": 8,
    "intensity": "normal"
  },
  {
    "id": "body_term_4",
    "words": [
      "body_part_4",
      "sensory_aspect_4",
      "anatomy_4"
    ],
    "phrases": [],
    "category": "body",
    "imageId": "silhouette",
    "weight": 5,
    "intensity": "normal"
  },
  {
    "id": "body_term_5",
    "words": [
      "body_part_5",
      "sensory_aspect_5",
      "anatomy_5"
    ],
    "phrases": [],
    "category": "body",
    "imageId": "paranoia",
    "weight": 6,
    "intensity": "normal"
  },
  {
    "id": "body_term_6",
    "words": [
      "body_part_6",
      "sensory_aspect_6",
      "anatomy_6"
    ],
    "phrases": [],
    "category": "body",
    "imageId": "crimson",
    "weight": 7,
    "intensity": "normal"
  },
  {
    "id": "body_term_7",
    "words": [
      "body_part_7",
      "sensory_aspect_7",
      "anatomy_7"
    ],
    "phrases": [],
    "category": "body",
    "imageId": "silhouette",
    "weight": 8,
    "intensity": "normal"
  },
  {
    "id": "body_term_8",
    "words": [
      "body_part_8",
      "sensory_aspect_8",
      "anatomy_8"
    ],
    "phrases": [],
    "category": "body",
    "imageId": "paranoia",
    "weight": 5,
    "intensity": "normal"
  },
  {
    "id": "body_term_9",
    "words": [
      "body_part_9",
      "sensory_aspect_9",
      "anatomy_9"
    ],
    "phrases": [],
    "category": "body",
    "imageId": "crimson",
    "weight": 6,
    "intensity": "normal"
  },
  {
    "id": "body_term_10",
    "words": [
      "body_part_10",
      "sensory_aspect_10",
      "anatomy_10"
    ],
    "phrases": [],
    "category": "body",
    "imageId": "silhouette",
    "weight": 7,
    "intensity": "normal"
  },
  {
    "id": "body_term_11",
    "words": [
      "body_part_11",
      "sensory_aspect_11",
      "anatomy_11"
    ],
    "phrases": [],
    "category": "body",
    "imageId": "paranoia",
    "weight": 8,
    "intensity": "normal"
  },
  {
    "id": "body_term_12",
    "words": [
      "body_part_12",
      "sensory_aspect_12",
      "anatomy_12"
    ],
    "phrases": [],
    "category": "body",
    "imageId": "crimson",
    "weight": 5,
    "intensity": "normal"
  },
  {
    "id": "body_term_13",
    "words": [
      "body_part_13",
      "sensory_aspect_13",
      "anatomy_13"
    ],
    "phrases": [],
    "category": "body",
    "imageId": "silhouette",
    "weight": 6,
    "intensity": "normal"
  },
  {
    "id": "body_term_14",
    "words": [
      "body_part_14",
      "sensory_aspect_14",
      "anatomy_14"
    ],
    "phrases": [],
    "category": "body",
    "imageId": "paranoia",
    "weight": 7,
    "intensity": "normal"
  },
  {
    "id": "body_term_15",
    "words": [
      "body_part_15",
      "sensory_aspect_15",
      "anatomy_15"
    ],
    "phrases": [],
    "category": "body",
    "imageId": "crimson",
    "weight": 8,
    "intensity": "normal"
  },
  {
    "id": "body_term_16",
    "words": [
      "body_part_16",
      "sensory_aspect_16",
      "anatomy_16"
    ],
    "phrases": [],
    "category": "body",
    "imageId": "silhouette",
    "weight": 5,
    "intensity": "normal"
  },
  {
    "id": "body_term_17",
    "words": [
      "body_part_17",
      "sensory_aspect_17",
      "anatomy_17"
    ],
    "phrases": [],
    "category": "body",
    "imageId": "paranoia",
    "weight": 6,
    "intensity": "normal"
  },
  {
    "id": "body_term_18",
    "words": [
      "body_part_18",
      "sensory_aspect_18",
      "anatomy_18"
    ],
    "phrases": [],
    "category": "body",
    "imageId": "crimson",
    "weight": 7,
    "intensity": "normal"
  },
  {
    "id": "body_term_19",
    "words": [
      "body_part_19",
      "sensory_aspect_19",
      "anatomy_19"
    ],
    "phrases": [],
    "category": "body",
    "imageId": "silhouette",
    "weight": 8,
    "intensity": "normal"
  },
  {
    "id": "body_term_20",
    "words": [
      "body_part_20",
      "sensory_aspect_20",
      "anatomy_20"
    ],
    "phrases": [],
    "category": "body",
    "imageId": "paranoia",
    "weight": 5,
    "intensity": "normal"
  },
  {
    "id": "body_term_21",
    "words": [
      "body_part_21",
      "sensory_aspect_21",
      "anatomy_21"
    ],
    "phrases": [],
    "category": "body",
    "imageId": "crimson",
    "weight": 6,
    "intensity": "normal"
  },
  {
    "id": "body_term_22",
    "words": [
      "body_part_22",
      "sensory_aspect_22",
      "anatomy_22"
    ],
    "phrases": [],
    "category": "body",
    "imageId": "silhouette",
    "weight": 7,
    "intensity": "normal"
  },
  {
    "id": "body_term_23",
    "words": [
      "body_part_23",
      "sensory_aspect_23",
      "anatomy_23"
    ],
    "phrases": [],
    "category": "body",
    "imageId": "paranoia",
    "weight": 8,
    "intensity": "normal"
  },
  {
    "id": "body_term_24",
    "words": [
      "body_part_24",
      "sensory_aspect_24",
      "anatomy_24"
    ],
    "phrases": [],
    "category": "body",
    "imageId": "crimson",
    "weight": 5,
    "intensity": "normal"
  },
  {
    "id": "body_term_25",
    "words": [
      "body_part_25",
      "sensory_aspect_25",
      "anatomy_25"
    ],
    "phrases": [],
    "category": "body",
    "imageId": "silhouette",
    "weight": 6,
    "intensity": "normal"
  },
  {
    "id": "body_term_26",
    "words": [
      "body_part_26",
      "sensory_aspect_26",
      "anatomy_26"
    ],
    "phrases": [],
    "category": "body",
    "imageId": "paranoia",
    "weight": 7,
    "intensity": "normal"
  },
  {
    "id": "body_term_27",
    "words": [
      "body_part_27",
      "sensory_aspect_27",
      "anatomy_27"
    ],
    "phrases": [],
    "category": "body",
    "imageId": "crimson",
    "weight": 8,
    "intensity": "normal"
  },
  {
    "id": "body_term_28",
    "words": [
      "body_part_28",
      "sensory_aspect_28",
      "anatomy_28"
    ],
    "phrases": [],
    "category": "body",
    "imageId": "silhouette",
    "weight": 5,
    "intensity": "normal"
  },
  {
    "id": "body_term_29",
    "words": [
      "body_part_29",
      "sensory_aspect_29",
      "anatomy_29"
    ],
    "phrases": [],
    "category": "body",
    "imageId": "paranoia",
    "weight": 6,
    "intensity": "normal"
  },
  {
    "id": "body_term_30",
    "words": [
      "body_part_30",
      "sensory_aspect_30",
      "anatomy_30"
    ],
    "phrases": [],
    "category": "body",
    "imageId": "crimson",
    "weight": 7,
    "intensity": "normal"
  },
  {
    "id": "body_term_31",
    "words": [
      "body_part_31",
      "sensory_aspect_31",
      "anatomy_31"
    ],
    "phrases": [],
    "category": "body",
    "imageId": "silhouette",
    "weight": 8,
    "intensity": "normal"
  },
  {
    "id": "body_term_32",
    "words": [
      "body_part_32",
      "sensory_aspect_32",
      "anatomy_32"
    ],
    "phrases": [],
    "category": "body",
    "imageId": "paranoia",
    "weight": 5,
    "intensity": "normal"
  },
  {
    "id": "body_term_33",
    "words": [
      "body_part_33",
      "sensory_aspect_33",
      "anatomy_33"
    ],
    "phrases": [],
    "category": "body",
    "imageId": "crimson",
    "weight": 6,
    "intensity": "normal"
  },
  {
    "id": "body_term_34",
    "words": [
      "body_part_34",
      "sensory_aspect_34",
      "anatomy_34"
    ],
    "phrases": [],
    "category": "body",
    "imageId": "silhouette",
    "weight": 7,
    "intensity": "normal"
  },
  {
    "id": "body_term_35",
    "words": [
      "body_part_35",
      "sensory_aspect_35",
      "anatomy_35"
    ],
    "phrases": [],
    "category": "body",
    "imageId": "paranoia",
    "weight": 8,
    "intensity": "normal"
  },
  {
    "id": "body_term_36",
    "words": [
      "body_part_36",
      "sensory_aspect_36",
      "anatomy_36"
    ],
    "phrases": [],
    "category": "body",
    "imageId": "crimson",
    "weight": 5,
    "intensity": "normal"
  },
  {
    "id": "body_term_37",
    "words": [
      "body_part_37",
      "sensory_aspect_37",
      "anatomy_37"
    ],
    "phrases": [],
    "category": "body",
    "imageId": "silhouette",
    "weight": 6,
    "intensity": "normal"
  },
  {
    "id": "body_term_38",
    "words": [
      "body_part_38",
      "sensory_aspect_38",
      "anatomy_38"
    ],
    "phrases": [],
    "category": "body",
    "imageId": "paranoia",
    "weight": 7,
    "intensity": "normal"
  },
  {
    "id": "body_term_39",
    "words": [
      "body_part_39",
      "sensory_aspect_39",
      "anatomy_39"
    ],
    "phrases": [],
    "category": "body",
    "imageId": "crimson",
    "weight": 8,
    "intensity": "normal"
  },
  {
    "id": "body_term_40",
    "words": [
      "body_part_40",
      "sensory_aspect_40",
      "anatomy_40"
    ],
    "phrases": [],
    "category": "body",
    "imageId": "silhouette",
    "weight": 5,
    "intensity": "normal"
  },
  {
    "id": "body_term_41",
    "words": [
      "body_part_41",
      "sensory_aspect_41",
      "anatomy_41"
    ],
    "phrases": [],
    "category": "body",
    "imageId": "paranoia",
    "weight": 6,
    "intensity": "normal"
  },
  {
    "id": "body_term_42",
    "words": [
      "body_part_42",
      "sensory_aspect_42",
      "anatomy_42"
    ],
    "phrases": [],
    "category": "body",
    "imageId": "crimson",
    "weight": 7,
    "intensity": "normal"
  },
  {
    "id": "body_term_43",
    "words": [
      "body_part_43",
      "sensory_aspect_43",
      "anatomy_43"
    ],
    "phrases": [],
    "category": "body",
    "imageId": "silhouette",
    "weight": 8,
    "intensity": "normal"
  },
  {
    "id": "body_term_44",
    "words": [
      "body_part_44",
      "sensory_aspect_44",
      "anatomy_44"
    ],
    "phrases": [],
    "category": "body",
    "imageId": "paranoia",
    "weight": 5,
    "intensity": "normal"
  },
  {
    "id": "body_term_45",
    "words": [
      "body_part_45",
      "sensory_aspect_45",
      "anatomy_45"
    ],
    "phrases": [],
    "category": "body",
    "imageId": "crimson",
    "weight": 6,
    "intensity": "normal"
  },
  {
    "id": "body_term_46",
    "words": [
      "body_part_46",
      "sensory_aspect_46",
      "anatomy_46"
    ],
    "phrases": [],
    "category": "body",
    "imageId": "silhouette",
    "weight": 7,
    "intensity": "normal"
  },
  {
    "id": "body_term_47",
    "words": [
      "body_part_47",
      "sensory_aspect_47",
      "anatomy_47"
    ],
    "phrases": [],
    "category": "body",
    "imageId": "paranoia",
    "weight": 8,
    "intensity": "normal"
  },
  {
    "id": "body_term_48",
    "words": [
      "body_part_48",
      "sensory_aspect_48",
      "anatomy_48"
    ],
    "phrases": [],
    "category": "body",
    "imageId": "crimson",
    "weight": 5,
    "intensity": "normal"
  },
  {
    "id": "body_term_49",
    "words": [
      "body_part_49",
      "sensory_aspect_49",
      "anatomy_49"
    ],
    "phrases": [],
    "category": "body",
    "imageId": "silhouette",
    "weight": 6,
    "intensity": "normal"
  },
  {
    "id": "body_term_50",
    "words": [
      "body_part_50",
      "sensory_aspect_50",
      "anatomy_50"
    ],
    "phrases": [],
    "category": "body",
    "imageId": "paranoia",
    "weight": 7,
    "intensity": "normal"
  },
  {
    "id": "body_term_51",
    "words": [
      "body_part_51",
      "sensory_aspect_51",
      "anatomy_51"
    ],
    "phrases": [],
    "category": "body",
    "imageId": "crimson",
    "weight": 8,
    "intensity": "normal"
  },
  {
    "id": "body_term_52",
    "words": [
      "body_part_52",
      "sensory_aspect_52",
      "anatomy_52"
    ],
    "phrases": [],
    "category": "body",
    "imageId": "silhouette",
    "weight": 5,
    "intensity": "normal"
  },
  {
    "id": "body_term_53",
    "words": [
      "body_part_53",
      "sensory_aspect_53",
      "anatomy_53"
    ],
    "phrases": [],
    "category": "body",
    "imageId": "paranoia",
    "weight": 6,
    "intensity": "normal"
  },
  {
    "id": "body_term_54",
    "words": [
      "body_part_54",
      "sensory_aspect_54",
      "anatomy_54"
    ],
    "phrases": [],
    "category": "body",
    "imageId": "crimson",
    "weight": 7,
    "intensity": "normal"
  },
  {
    "id": "body_term_55",
    "words": [
      "body_part_55",
      "sensory_aspect_55",
      "anatomy_55"
    ],
    "phrases": [],
    "category": "body",
    "imageId": "silhouette",
    "weight": 8,
    "intensity": "normal"
  },
  {
    "id": "body_term_56",
    "words": [
      "body_part_56",
      "sensory_aspect_56",
      "anatomy_56"
    ],
    "phrases": [],
    "category": "body",
    "imageId": "paranoia",
    "weight": 5,
    "intensity": "normal"
  },
  {
    "id": "body_term_57",
    "words": [
      "body_part_57",
      "sensory_aspect_57",
      "anatomy_57"
    ],
    "phrases": [],
    "category": "body",
    "imageId": "crimson",
    "weight": 6,
    "intensity": "normal"
  },
  {
    "id": "body_term_58",
    "words": [
      "body_part_58",
      "sensory_aspect_58",
      "anatomy_58"
    ],
    "phrases": [],
    "category": "body",
    "imageId": "silhouette",
    "weight": 7,
    "intensity": "normal"
  },
  {
    "id": "body_term_59",
    "words": [
      "body_part_59",
      "sensory_aspect_59",
      "anatomy_59"
    ],
    "phrases": [],
    "category": "body",
    "imageId": "paranoia",
    "weight": 8,
    "intensity": "normal"
  },
  {
    "id": "body_term_60",
    "words": [
      "body_part_60",
      "sensory_aspect_60",
      "anatomy_60"
    ],
    "phrases": [],
    "category": "body",
    "imageId": "crimson",
    "weight": 5,
    "intensity": "normal"
  },
  {
    "id": "body_term_61",
    "words": [
      "body_part_61",
      "sensory_aspect_61",
      "anatomy_61"
    ],
    "phrases": [],
    "category": "body",
    "imageId": "silhouette",
    "weight": 6,
    "intensity": "normal"
  },
  {
    "id": "body_term_62",
    "words": [
      "body_part_62",
      "sensory_aspect_62",
      "anatomy_62"
    ],
    "phrases": [],
    "category": "body",
    "imageId": "paranoia",
    "weight": 7,
    "intensity": "normal"
  },
  {
    "id": "body_term_63",
    "words": [
      "body_part_63",
      "sensory_aspect_63",
      "anatomy_63"
    ],
    "phrases": [],
    "category": "body",
    "imageId": "crimson",
    "weight": 8,
    "intensity": "normal"
  },
  {
    "id": "body_term_64",
    "words": [
      "body_part_64",
      "sensory_aspect_64",
      "anatomy_64"
    ],
    "phrases": [],
    "category": "body",
    "imageId": "silhouette",
    "weight": 5,
    "intensity": "normal"
  },
  {
    "id": "body_term_65",
    "words": [
      "body_part_65",
      "sensory_aspect_65",
      "anatomy_65"
    ],
    "phrases": [],
    "category": "body",
    "imageId": "paranoia",
    "weight": 6,
    "intensity": "normal"
  },
  {
    "id": "body_term_66",
    "words": [
      "body_part_66",
      "sensory_aspect_66",
      "anatomy_66"
    ],
    "phrases": [],
    "category": "body",
    "imageId": "crimson",
    "weight": 7,
    "intensity": "normal"
  },
  {
    "id": "body_term_67",
    "words": [
      "body_part_67",
      "sensory_aspect_67",
      "anatomy_67"
    ],
    "phrases": [],
    "category": "body",
    "imageId": "silhouette",
    "weight": 8,
    "intensity": "normal"
  },
  {
    "id": "body_term_68",
    "words": [
      "body_part_68",
      "sensory_aspect_68",
      "anatomy_68"
    ],
    "phrases": [],
    "category": "body",
    "imageId": "paranoia",
    "weight": 5,
    "intensity": "normal"
  },
  {
    "id": "body_term_69",
    "words": [
      "body_part_69",
      "sensory_aspect_69",
      "anatomy_69"
    ],
    "phrases": [],
    "category": "body",
    "imageId": "crimson",
    "weight": 6,
    "intensity": "normal"
  },
  {
    "id": "body_term_70",
    "words": [
      "body_part_70",
      "sensory_aspect_70",
      "anatomy_70"
    ],
    "phrases": [],
    "category": "body",
    "imageId": "silhouette",
    "weight": 7,
    "intensity": "normal"
  },
  {
    "id": "body_term_71",
    "words": [
      "body_part_71",
      "sensory_aspect_71",
      "anatomy_71"
    ],
    "phrases": [],
    "category": "body",
    "imageId": "paranoia",
    "weight": 8,
    "intensity": "normal"
  },
  {
    "id": "body_term_72",
    "words": [
      "body_part_72",
      "sensory_aspect_72",
      "anatomy_72"
    ],
    "phrases": [],
    "category": "body",
    "imageId": "crimson",
    "weight": 5,
    "intensity": "normal"
  },
  {
    "id": "body_term_73",
    "words": [
      "body_part_73",
      "sensory_aspect_73",
      "anatomy_73"
    ],
    "phrases": [],
    "category": "body",
    "imageId": "silhouette",
    "weight": 6,
    "intensity": "normal"
  },
  {
    "id": "body_term_74",
    "words": [
      "body_part_74",
      "sensory_aspect_74",
      "anatomy_74"
    ],
    "phrases": [],
    "category": "body",
    "imageId": "paranoia",
    "weight": 7,
    "intensity": "normal"
  },
  {
    "id": "body_term_75",
    "words": [
      "body_part_75",
      "sensory_aspect_75",
      "anatomy_75"
    ],
    "phrases": [],
    "category": "body",
    "imageId": "crimson",
    "weight": 8,
    "intensity": "normal"
  },
  {
    "id": "body_term_76",
    "words": [
      "body_part_76",
      "sensory_aspect_76",
      "anatomy_76"
    ],
    "phrases": [],
    "category": "body",
    "imageId": "silhouette",
    "weight": 5,
    "intensity": "normal"
  },
  {
    "id": "body_term_77",
    "words": [
      "body_part_77",
      "sensory_aspect_77",
      "anatomy_77"
    ],
    "phrases": [],
    "category": "body",
    "imageId": "paranoia",
    "weight": 6,
    "intensity": "normal"
  },
  {
    "id": "body_term_78",
    "words": [
      "body_part_78",
      "sensory_aspect_78",
      "anatomy_78"
    ],
    "phrases": [],
    "category": "body",
    "imageId": "crimson",
    "weight": 7,
    "intensity": "normal"
  },
  {
    "id": "body_term_79",
    "words": [
      "body_part_79",
      "sensory_aspect_79",
      "anatomy_79"
    ],
    "phrases": [],
    "category": "body",
    "imageId": "silhouette",
    "weight": 8,
    "intensity": "normal"
  },
  {
    "id": "body_term_80",
    "words": [
      "body_part_80",
      "sensory_aspect_80",
      "anatomy_80"
    ],
    "phrases": [],
    "category": "body",
    "imageId": "paranoia",
    "weight": 5,
    "intensity": "normal"
  },
  {
    "id": "body_term_81",
    "words": [
      "body_part_81",
      "sensory_aspect_81",
      "anatomy_81"
    ],
    "phrases": [],
    "category": "body",
    "imageId": "crimson",
    "weight": 6,
    "intensity": "normal"
  },
  {
    "id": "body_term_82",
    "words": [
      "body_part_82",
      "sensory_aspect_82",
      "anatomy_82"
    ],
    "phrases": [],
    "category": "body",
    "imageId": "silhouette",
    "weight": 7,
    "intensity": "normal"
  },
  {
    "id": "body_term_83",
    "words": [
      "body_part_83",
      "sensory_aspect_83",
      "anatomy_83"
    ],
    "phrases": [],
    "category": "body",
    "imageId": "paranoia",
    "weight": 8,
    "intensity": "normal"
  },
  {
    "id": "body_term_84",
    "words": [
      "body_part_84",
      "sensory_aspect_84",
      "anatomy_84"
    ],
    "phrases": [],
    "category": "body",
    "imageId": "crimson",
    "weight": 5,
    "intensity": "normal"
  },
  {
    "id": "body_term_85",
    "words": [
      "body_part_85",
      "sensory_aspect_85",
      "anatomy_85"
    ],
    "phrases": [],
    "category": "body",
    "imageId": "silhouette",
    "weight": 6,
    "intensity": "normal"
  },
  {
    "id": "body_term_86",
    "words": [
      "body_part_86",
      "sensory_aspect_86",
      "anatomy_86"
    ],
    "phrases": [],
    "category": "body",
    "imageId": "paranoia",
    "weight": 7,
    "intensity": "normal"
  },
  {
    "id": "body_term_87",
    "words": [
      "body_part_87",
      "sensory_aspect_87",
      "anatomy_87"
    ],
    "phrases": [],
    "category": "body",
    "imageId": "crimson",
    "weight": 8,
    "intensity": "normal"
  },
  {
    "id": "body_term_88",
    "words": [
      "body_part_88",
      "sensory_aspect_88",
      "anatomy_88"
    ],
    "phrases": [],
    "category": "body",
    "imageId": "silhouette",
    "weight": 5,
    "intensity": "normal"
  },
  {
    "id": "body_term_89",
    "words": [
      "body_part_89",
      "sensory_aspect_89",
      "anatomy_89"
    ],
    "phrases": [],
    "category": "body",
    "imageId": "paranoia",
    "weight": 6,
    "intensity": "normal"
  },
  {
    "id": "body_term_90",
    "words": [
      "body_part_90",
      "sensory_aspect_90",
      "anatomy_90"
    ],
    "phrases": [],
    "category": "body",
    "imageId": "crimson",
    "weight": 7,
    "intensity": "normal"
  },
  {
    "id": "body_term_91",
    "words": [
      "body_part_91",
      "sensory_aspect_91",
      "anatomy_91"
    ],
    "phrases": [],
    "category": "body",
    "imageId": "silhouette",
    "weight": 8,
    "intensity": "normal"
  },
  {
    "id": "body_term_92",
    "words": [
      "body_part_92",
      "sensory_aspect_92",
      "anatomy_92"
    ],
    "phrases": [],
    "category": "body",
    "imageId": "paranoia",
    "weight": 5,
    "intensity": "normal"
  },
  {
    "id": "body_term_93",
    "words": [
      "body_part_93",
      "sensory_aspect_93",
      "anatomy_93"
    ],
    "phrases": [],
    "category": "body",
    "imageId": "crimson",
    "weight": 6,
    "intensity": "normal"
  },
  {
    "id": "body_term_94",
    "words": [
      "body_part_94",
      "sensory_aspect_94",
      "anatomy_94"
    ],
    "phrases": [],
    "category": "body",
    "imageId": "silhouette",
    "weight": 7,
    "intensity": "normal"
  },
  {
    "id": "body_term_95",
    "words": [
      "body_part_95",
      "sensory_aspect_95",
      "anatomy_95"
    ],
    "phrases": [],
    "category": "body",
    "imageId": "paranoia",
    "weight": 8,
    "intensity": "normal"
  },
  {
    "id": "body_term_96",
    "words": [
      "body_part_96",
      "sensory_aspect_96",
      "anatomy_96"
    ],
    "phrases": [],
    "category": "body",
    "imageId": "crimson",
    "weight": 5,
    "intensity": "normal"
  },
  {
    "id": "body_term_97",
    "words": [
      "body_part_97",
      "sensory_aspect_97",
      "anatomy_97"
    ],
    "phrases": [],
    "category": "body",
    "imageId": "silhouette",
    "weight": 6,
    "intensity": "normal"
  },
  {
    "id": "body_term_98",
    "words": [
      "body_part_98",
      "sensory_aspect_98",
      "anatomy_98"
    ],
    "phrases": [],
    "category": "body",
    "imageId": "paranoia",
    "weight": 7,
    "intensity": "normal"
  },
  {
    "id": "body_term_99",
    "words": [
      "body_part_99",
      "sensory_aspect_99",
      "anatomy_99"
    ],
    "phrases": [],
    "category": "body",
    "imageId": "crimson",
    "weight": 8,
    "intensity": "normal"
  },
  {
    "id": "body_term_100",
    "words": [
      "body_part_100",
      "sensory_aspect_100",
      "anatomy_100"
    ],
    "phrases": [],
    "category": "body",
    "imageId": "silhouette",
    "weight": 5,
    "intensity": "normal"
  },
  {
    "id": "body_term_101",
    "words": [
      "body_part_101",
      "sensory_aspect_101",
      "anatomy_101"
    ],
    "phrases": [],
    "category": "body",
    "imageId": "paranoia",
    "weight": 6,
    "intensity": "normal"
  },
  {
    "id": "body_term_102",
    "words": [
      "body_part_102",
      "sensory_aspect_102",
      "anatomy_102"
    ],
    "phrases": [],
    "category": "body",
    "imageId": "crimson",
    "weight": 7,
    "intensity": "normal"
  },
  {
    "id": "body_term_103",
    "words": [
      "body_part_103",
      "sensory_aspect_103",
      "anatomy_103"
    ],
    "phrases": [],
    "category": "body",
    "imageId": "silhouette",
    "weight": 8,
    "intensity": "normal"
  },
  {
    "id": "body_term_104",
    "words": [
      "body_part_104",
      "sensory_aspect_104",
      "anatomy_104"
    ],
    "phrases": [],
    "category": "body",
    "imageId": "paranoia",
    "weight": 5,
    "intensity": "normal"
  },
  {
    "id": "body_term_105",
    "words": [
      "body_part_105",
      "sensory_aspect_105",
      "anatomy_105"
    ],
    "phrases": [],
    "category": "body",
    "imageId": "crimson",
    "weight": 6,
    "intensity": "normal"
  },
  {
    "id": "body_term_106",
    "words": [
      "body_part_106",
      "sensory_aspect_106",
      "anatomy_106"
    ],
    "phrases": [],
    "category": "body",
    "imageId": "silhouette",
    "weight": 7,
    "intensity": "normal"
  },
  {
    "id": "body_term_107",
    "words": [
      "body_part_107",
      "sensory_aspect_107",
      "anatomy_107"
    ],
    "phrases": [],
    "category": "body",
    "imageId": "paranoia",
    "weight": 8,
    "intensity": "normal"
  }
];
