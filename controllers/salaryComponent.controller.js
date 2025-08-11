import SalaryComponent from '../models/SalaryComponent.js';

// @desc    Create a new master salary component (e.g., "HRA", "PF")
// @route   POST /api/salary-components
// @access  Private (HR/Admin)
export const createSalaryComponent = async (req, res) => {
  try {
    // This controller now only expects 'name' and 'type' from the request body.
    const { name, type } = req.body;

    if (!name || !type) {
      return res.status(400).json({ error: 'Component name and type are required.' });
    }

    const componentExists = await SalaryComponent.findOne({ name });
    if (componentExists) {
      return res.status(400).json({ error: 'A salary component with this name already exists.' });
    }

    const newComponent = new SalaryComponent({ name, type });
    await newComponent.save();
    res.status(201).json(newComponent);
  } catch (err) {
    // This will catch schema validation errors, like an invalid 'type'.
    res.status(400).json({ error: err.message });
  }
};

// @desc    Get all master salary components
// @route   GET /api/salary-components
// @access  Private (HR/Admin)
export const getAllSalaryComponents = async (req, res) => {
  try {
    const components = await SalaryComponent.find({}).sort({ type: 1, name: 1 }); // Sort by type, then name
    res.json(components);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

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
// @route   PUT /api/salary-components/:id
// @access  Private (HR/Admin)
export const updateSalaryComponent = async (req, res) => {
  try {
    // The request body should only contain fields to be updated, like 'name' or 'type'.
    const updatedComponent = await SalaryComponent.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true } // Return the updated document and run schema validation
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
// @route   DELETE /api/salary-components/:id
// @access  Private (HR/Admin)
export const deleteSalaryComponent = async (req, res) => {
  try {
    // In a production app, you might add a check here to see if this component
    // is currently assigned to any employee in EmployeeSalaryProfile before deleting.
    const deletedComponent = await SalaryComponent.findByIdAndDelete(req.params.id);
    if (!deletedComponent) {
      return res.status(404).json({ error: 'Salary component not found.' });
    }
    res.json({ message: 'Salary component deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};