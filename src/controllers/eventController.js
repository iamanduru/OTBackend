import { PrismaClient } from "@prisma/client";
import validator from 'validator';

const prisma = new PrismaClient();

//Validate category Input
const validateCategories = (categories) => {
    if(!Array.isArray(categories) || categories.length === 0) {
        return 'At least one ticket category is required';
    }
    for (const c of categories) {
        if (!c.name || typeof c.name !== 'string') return 'Each category needs a name';
        if (c.price == null || isNaN(Number(c.price)) || Number(c.price) < 0) return 'Invalid category price';
        if (!Number.isInteger(c.totalQuantity) || c.totalQuantity < 1) return 'invalid category totalQuantity';
    }
    return null;
};

export const createEvent = async (req, res, next) => {
  try {
    const { title, description, startTime, categories } = req.body;

    if (!title || !startTime) {
      return res.status(400).json({ error: 'Title and start time are required!' });
    }

    const start = new Date(startTime);
    if (isNaN(start)) return res.status(400).json({ error: 'Invalid startTime' });
    if (start <= new Date())
      return res.status(400).json({ error: 'startTime must be in the future' });

    const catErr = validateCategories(categories);
    if (catErr) return res.status(400).json({ error: catErr });

    const event = await prisma.event.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        startTime: start,
        categories: {
          create: categories.map((c) => ({
            name: c.name.trim(),
            price: c.price,
            totalQuantity: c.totalQuantity,
          })),
        },
      },
      include: { categories: true },
    });

    res.status(201).json(event);
  } catch (error) {
    next(error);
  }
};

//Getting all events (with categories and availability)
export const listEvents = async (req, res, next) => {
    try {
        const events = await prisma.event.findMany({
      include: {
        categories: {
          include: {
            tickets: true
          }
        }
      }
    });

    //Availability per category
    const enriched = events.map((e) => {
        const cats = e.categories.map((c) => {
            const sold = c.tickets.length;
            return {
                id: c.id,
                name: c.name,
                price: c.price,
                totalQuantity: c.totalQuantity,
                sold,
                available: c.totalQuantity - sold
            };
        });
        return {
            id: e.id,
            title: e.title,
            description: e.description,
            startTime: e.startTime,
            createdAt: e.createdAt,
            updatedAt: e.updatedAt,
            categories: cats
        };
    });
    res.json(enriched);
    } catch (error) {
        next(error);
    }
};

//Single event
export const getEvent = async (req, res, next) => {
    try {
        const { id } = req.params;
        const event = await prisma.event.findUnique({
            where: { id: parseInt(id, 10) },
            include: {
                categories: {
                    include: {
                        tickets: true
                    }
                }
            }
        });
        if (!event) return res.status(404).json({ error: 'Event not found'});

        const categories = event.categories.map((c) => {
            const sold = c.tickets.length;

            return {
                id: c.id,
                name: c.name,
                price: c.price,
                totalQuantity: c.totalQuantity,
                sold,
                available: c.totalQuantity - sold
            };
        });

        res.json({
            id: event.id,
            title: event.title,
            description: event.description,
            startTime: event.startTime,
            categories,
            createdAt: event.createdAt,
            updatedAt: event.updatedAt
        });
    } catch (error) {
        next(error);
    }
};

//Update event
export const updateEvent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, description, startTime } = req.body;
    const data = {};
    if (title) data.title = title.trim();
    if (description !== undefined) data.description = description?.trim() || null;
    if (startTime) {
      const start = new Date(startTime);
      if (isNaN(start)) return res.status(400).json({ error: 'Invalid startTime' });
      if (start <= new Date()) return res.status(400).json({ error: 'startTime must be in the future' });
      data.startTime = start;
    }

    if (Object.keys(data).length === 0) return res.status(400).json({ error: 'No valid fields to update' });

    const event = await prisma.event.update({
      where: { id: parseInt(id, 10) },
      data,
      include: { categories: true }
    });

    res.json(event);
  } catch (err) {
    next(err);
  }
};

//Soft delete
export const deleteEvent = async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.event.delete({ where: { id: parseInt(id, 10) } });
    res.json({ message: 'Event deleted' });
  } catch (err) {
    next(err);
  }
};
