export function calculateRequirements(presentStudents) {
  const students = Number(presentStudents || 0);

  return {
    rice: Number((students * 0.1).toFixed(1)),
    pulse: Number((students * 0.02).toFixed(1)),
    oil: Number((students * 0.005).toFixed(2)),
  };
}
