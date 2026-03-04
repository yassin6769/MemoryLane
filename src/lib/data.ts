export type CanvasItem = {
  id: string;
  type: 'image' | 'text';
  content: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scale: number;
};

export type ScrapbookPageDef = {
  id: string;
  items: CanvasItem[];
};

export type Scrapbook = {
  id: string;
  title: string;
  category: string;
  ownerId: string;
  collaboratorIds: string[];
  coverImage: string;
  pages: ScrapbookPageDef[];
};

export const scrapbooks: Scrapbook[] = [
  {
    id: '1',
    title: 'Summer Holiday in Italy',
    category: 'Holiday',
    ownerId: 'user1',
    collaboratorIds: ['user2'],
    coverImage: 'https://picsum.photos/seed/101/400/300',
    pages: [
      {
        id: 'page1',
        items: [
          {
            id: 'item1',
            type: 'image',
            content: 'https://picsum.photos/seed/201/300/200',
            x: 50,
            y: 50,
            width: 300,
            height: 200,
            rotation: -5,
            scale: 1,
          },
          {
            id: 'item2',
            type: 'text',
            content: 'Exploring Rome!',
            x: 400,
            y: 100,
            width: 250,
            height: 50,
            rotation: 0,
            scale: 1.2,
          },
          {
            id: 'item3',
            type: 'image',
            content: 'https://picsum.photos/seed/203/250/350',
            x: 100,
            y: 300,
            width: 250,
            height: 350,
            rotation: 10,
            scale: 1,
          },
        ],
      },
    ],
  },
  {
    id: '2',
    title: 'John\'s 30th Birthday',
    category: 'Birthday',
    ownerId: 'user1',
    collaboratorIds: ['user2', 'user3'],
    coverImage: 'https://picsum.photos/seed/102/400/300',
    pages: [],
  },
  {
    id: '3',
    title: 'Our Family Moments',
    category: 'Family',
    ownerId: 'user2',
    collaboratorIds: [],
    coverImage: 'https://picsum.photos/seed/103/400/300',
    pages: [],
  },
  {
    id: '4',
    title: 'Mike & Sarah\'s Wedding',
    category: 'Wedding',
    ownerId: 'user3',
    collaboratorIds: ['user1'],
    coverImage: 'https://picsum.photos/seed/104/400/300',
    pages: [],
  },
];
