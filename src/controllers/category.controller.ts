import { Request, Response } from 'express';
import prisma from '../config/database';

// Create Category
export const createCategory = async (req: Request, res: Response) => {
  const { name } = req.body;
  try {
    const category = await prisma.category.create({ data: { name } });
    res.status(201).json(category);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create category', detail: error });
  }
};

// Get All Categories
export const getAllCategories = async (_req: Request, res: Response) => {
  try {
    const categories = await prisma.category.findMany({ include: { videos: true } });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
};

// Get One Category
export const getCategoryById = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const category = await prisma.category.findUnique({
      where: { id },
      include: { videos: true },
    });

    if (!category) return res.status(404).json({ error: 'Category not found' });

    res.json(category);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching category' });
  }
};

// Update Category
export const updateCategory = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name } = req.body;
  try {
    const updated = await prisma.category.update({
      where: { id },
      data: { name },
    });

    res.json(updated);
  } catch (error) {
    res.status(400).json({ error: 'Failed to update category' });
  }
};

// Delete Category
export const deleteCategory = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await prisma.category.delete({ where: { id } });
    res.json({ message: 'Category deleted' });
  } catch (error) {
    res.status(400).json({ error: 'Failed to delete category' });
  }
};
