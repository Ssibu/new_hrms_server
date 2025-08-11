import SalaryComponent from '../models/SalaryComponent.js';

// @desc    Create a new master salary component (e.g., HRA, PF)
// @route   POST /api/salary-components
// @access  Private (HR/Admin with payroll:manage permission)
export const createSalaryComponent = async (req, res) => {
  try {
    const { name, type, calculationType, value } = req.body;

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
// @route   GET /api/salary-components
// @access  Private (HR/Admin with payroll:manage permission)
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
// @access  Private (HR/Admin with payroll:manage permission)
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
// @access  Private (HR/Admin with payroll:manage permission)
export const updateSalaryComponent = async (req, res) => {
  try {
    const updatedComponent = await SalaryComponent.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true } // Return the updated doc and run schema validation
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
// @access  Private (HR/Admin with payroll:manage permission)
export const deleteSalaryComponent = async (req, res) => {
  try {
    // IMPORTANT: In a production app, you should first check if this component
    // is being used in any EmployeeSalaryProfile before deleting it.
    const deletedComponent = await SalaryComponent.findByIdAndDelete(req.params.id);
    if (!deletedComponent) {
      return res.status(404).json({ error: 'Salary component not found.' });
    }
    res.json({ message: 'Salary component deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};