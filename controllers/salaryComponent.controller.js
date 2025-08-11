import SalaryComponent from '../models/SalaryComponent.js';

// @desc    Create a new master salary component (e.g., HRA, PF)
export const createSalaryComponent = async (req, res) => {
  try {
    const { name, type, calculationType, value } = req.body;

    if (!name || !type || !calculationType || value === undefined) {
        return res.status(400).json({ error: 'Name, type, calculationType, and value are all required.' });
    }

    const componentExists = await SalaryComponent.findOne({ name });
    if (componentExists) {
      return res.status(400).json({ error: 'A salary component with this name already exists.' });
    }

    const newComponent = new SalaryComponent({ name, type, calculationType, value });
    await newComponent.save();
    res.status(201).json(newComponent);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// @desc    Get all master salary components
export const getAllSalaryComponents = async (req, res) => {
  try {
    const components = await SalaryComponent.find({}).sort({ type: 1, name: 1 });
    res.json(components);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// --- THIS FUNCTION IS NOW RESTORED ---
// @desc    Get a single salary component by its ID
// @route   GET /api/salary-components/:id
// @access  Private (HR/Admin)
export const getSalaryComponentById = async (req, res) => {
  try {
    const component = await SalaryComponent.findById(req.params.id);
    if (!component) {
      return res.status(404).json({ error: 'Salary component not found.' });
    }
    res.json(component);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// @desc    Update a master salary component
export const updateSalaryComponent = async (req, res) => {
  try {
    const updatedComponent = await SalaryComponent.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { new: true, runValidators: true }
    );
    if (!updatedComponent) {
      return res.status(404).json({ error: 'Salary component not found.' });
    }
    res.json(updatedComponent);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// @desc    Delete a master salary component
export const deleteSalaryComponent = async (req, res) => {
  try {
    const deletedComponent = await SalaryComponent.findByIdAndDelete(req.params.id);
    if (!deletedComponent) {
      return res.status(404).json({ error: 'Salary component not found.' });
    }
    res.json({ message: 'Salary component deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};