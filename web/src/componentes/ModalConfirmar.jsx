import Modal from './Modal';

/**
 * Confirmação de uma ação destrutiva (apagar um produto, um leilão, uma
 * avaliação), em vez da janela cinzenta do browser.
 *
 * Além de ficar coerente com o resto da aplicação, deixa escrever uma frase a
 * dizer o que se perde — coisa que o `confirm()` do browser não permite.
 */
export default function ModalConfirmar({
  titulo,
  mensagem,
  textoAcao = 'Apagar',
  aoConfirmar,
  aoFechar,
}) {
  return (
    <Modal
      titulo={titulo}
      aoFechar={aoFechar}
      rodape={
        <>
          <button type="button" className="btn btn-outline-secondary" onClick={aoFechar}>
            Cancelar
          </button>
          <button type="button" className="btn btn-danger" onClick={aoConfirmar}>
            {textoAcao}
          </button>
        </>
      }
    >
      <p className="mb-0">{mensagem}</p>
    </Modal>
  );
}
