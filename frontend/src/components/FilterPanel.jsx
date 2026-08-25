import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Slider } from '@mui/material'; // using Material UI slider for slickness
import { X } from 'lucide-react';

/**
 * FilterPanel – premium filter UI for property listings.
 * Features:
 *   • Collapsible panel with glassmorphism background.
 *   • Animated entry/exit using framer‑motion.
 *   • Supports price range, size range, and category selection.
 *   • Calls `onChange` with an object containing the selected filters.
 */
const FilterPanel = ({ categories = [], onChange }) => {
  const [open, setOpen] = useState(false);
  const [price, setPrice] = useState([0, 200]); // in lakhs
  const [size, setSize] = useState([0, 5000]); // sq ft
  const [selectedCats, setSelectedCats] = useState([]);

  const toggleCat = (cat) => {
    setSelectedCats((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const applyFilters = () => {
    const filters = { price, size, categories: selectedCats };
    onChange && onChange(filters);
    setOpen(false);
  };

  return (
    <div className="relative">
      {/* Trigger button */}
      <button
        className="btn-outline flex items-center gap-2"
        onClick={() => setOpen(true)}
        data-testid="filter-toggle"
      >
        <span>Filters</span>
      </button>

      {/* Overlay */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          >
            <motion.div
              className="bg-white/90 dark:bg-gray-800/90 backdrop-filter backdrop-blur-lg rounded-xl p-6 w-full max-w-md mx-4 shadow-xl"
              initial={{ scale: 0.9, y: -20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: -20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-display text-lg text-gray-800 dark:text-gray-200">
                  Refine Search
                </h3>
                <button onClick={() => setOpen(false)} aria-label="Close" data-testid="filter-close">
                  <X size={20} className="text-gray-600 dark:text-gray-300" />
                </button>
              </div>

              {/* Price range */}
              <div className="mb-4">
                <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Price (₹ Lakhs)
                </label>
                <input
                  type="range"
                  min={0}
                  max={2000}
                  step={10}
                  value={price[0]}
                  onChange={(e) => setPrice([Number(e.target.value), price[1]])}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                  <span>{price[0]}L</span>
                  <span>{price[1]}L</span>
                </div>
              </div>

              {/* Size range */}
              <div className="mb-4">
                <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Size (sq ft)
                </label>
                <Slider
                  value={size}
                  onChange={(_, newVal) => setSize(newVal)}
                  valueLabelDisplay="auto"
                  min={0}
                  max={10000}
                  step={50}
                />
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                  <span>{size[0]} sq ft</span>
                  <span>{size[1]} sq ft</span>
                </div>
              </div>

              {/* Category chips */}
              <div className="mb-4">
                <span className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Property Type
                </span>
                <div className="flex flex-wrap gap-2">
                  {categories.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      className={`chip ${selectedCats.includes(c.value) ? 'chip-active' : ''}`}
                      onClick={() => toggleCat(c.value)}
                      data-testid={`filter-cat-${c.value}`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                <button
                  className="btn-outline"
                  onClick={() => setOpen(false)}
                  data-testid="filter-cancel"
                >
                  Cancel
                </button>
                <button
                  className="btn-primary"
                  onClick={applyFilters}
                  data-testid="filter-apply"
                >
                  Apply
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FilterPanel;
