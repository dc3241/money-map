import { usePlaidActualsOptional } from '../../context/PlaidActualsContext';
import { useMoneyCoach } from '../../context/MoneyCoachContext';
import { useAssistantChat } from '../../hooks/useAssistantChat';
import MoneyCoachFAB from './MoneyCoachFAB';
import MoneyCoachPanel from './MoneyCoachPanel';

export default function MoneyCoachHost() {
  const plaid = usePlaidActualsOptional();
  const { referenceDate, dashboardPlaidOverlay, isOpen } = useMoneyCoach();

  const usePlaidLinked = plaid?.usePlaidForActuals ?? false;

  const { messages, loading, loadingHistory, error, setError, sendMessage } = useAssistantChat({
    referenceDate,
    dashboardPlaidOverlay,
    usePlaidLinkedActuals: usePlaidLinked,
  });

  return (
    <>
      <MoneyCoachFAB />
      {isOpen && (
        <MoneyCoachPanel
          messages={messages}
          loading={loading}
          loadingHistory={loadingHistory}
          error={error}
          onDismissError={() => setError(null)}
          onSend={sendMessage}
        />
      )}
    </>
  );
}
