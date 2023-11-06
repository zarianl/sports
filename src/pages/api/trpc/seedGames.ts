// pages/api/seedGames.js

import { seedGames } from '../../../../prisma/seed'
import { type NextApiRequest, type NextApiResponse } from 'next';

const seedGamesHandler = async (_req: NextApiRequest, res: NextApiResponse) => {
    try {
        await seedGames();
        res.status(200).json({ message: 'Games seeded successfully.' });
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while seeding games.' });
    }
};

export default seedGamesHandler;