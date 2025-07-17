import EmployeeSalary from '../models/EmployeeSalary.js';

export const getAllSalaries = async (req, res) => {
  try {
    const salaries = await EmployeeSalary.find();
    res.json(salaries);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getSalaryById = async (req, res) => {
  try {
    const salary = await EmployeeSalary.findById(req.params.id);
    if (!salary) return res.status(404).json({ error: 'Salary record not found' });
    res.json(salary);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const createSalary = async (req, res) => {
  try {
    const newSalary = new EmployeeSalary(req.body);
    await newSalary.save();
    res.status(201).json(newSalary);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const updateSalary = async (req, res) => {
  try {
    const updated = await EmployeeSalary.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ error: 'Salary record not found' });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const deleteSalary = async (req, res) => {
  try {
    const deleted = await EmployeeSalary.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Salary record not found' });
    res.json({ message: 'Salary record deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}; 