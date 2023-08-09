const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
const port = process.env.PORT || 3000;

const url = 'https://agenda-service.vercel.app/';

app.use(bodyParser.json());

function definirHorarioComercial(dataOriginal, horarioComercial) {
  // Converter horário comercial para horas e minutos
  var [horas, minutos] = horarioComercial.split(":").map(Number);

  // Criar uma nova cópia da data original
  var novaData = new Date(dataOriginal);

  // Definir o horário comercial desejado
  novaData.setUTCHours(horas, minutos, 0, 0);

  return novaData.toISOString();
}

app.post('/dialogflow-webhook', async (req, res) => {
  try {
    const intent = req.body.queryResult.intent.displayName;
    const outputContexts = req.body.queryResult.outputContexts[0].parameters;
    
    // "parameters": {
    //   "date.original": "10-08",
    //   "professionalId.original": "1",
    //   "horario_comercial": "10:00",
    //   "serviceId.original": "1",
    //   "professionalId": 1,
    //   "date": "2023-08-10T12:00:00-03:00",
    //   "horario_comercial.original": "10h00",
    //   "serviceId": 1
    // }
          
    let responseText;
    let resultSet;

    switch (intent) {
      case 'FinalizaIntent':
        const date = definirHorarioComercial(outputContexts.date, outputContexts.horario_comercial);
        const appointmentData = {
          professionalId: outputContexts.professionalId,
          serviceId: outputContexts.serviceId,
          appointmentDateTime: date,
        };
        resultSet = await axios.post(`${url}scheduling/create-appointment`, appointmentData);

        if(resultSet.data?.error) {
          responseText = 'Agendamento sem sucesso.';
          break;
        }

        if (resultSet.data.result) {
          responseText = 'Agendamento com sucesso.';
        }

        break;

      case 'DiaIntent':
        const availabilityData = {
          professionalId: outputContexts.professionalId,
          serviceId: outputContexts.serviceId,
        };
        resultSet = await axios.get(`${url}scheduling/available-dates?`, { params: availabilityData });
        if(resultSet.data?.error) {
          responseText = 'Erro ao obter datas disponíveis.';
          break;
        }

        if (Array.isArray(resultSet.data.result)) {
          responseText = resultSet.data.result.join('\n');
        }
        break;

      case 'HoraIntent':
        const availableTimesData = {
          professionalId: outputContexts.professionalId,
          serviceId: outputContexts.serviceId,
          date: outputContexts.date.split('T')[0],
        };
        resultSet = await axios.get(`${url}scheduling/available-times?`, { params: availableTimesData });

        if(resultSet.data?.error) {
          responseText = 'Erro ao obter horários disponíveis';
          break;
        }

        if (Array.isArray(resultSet.data.result)){
          responseText = resultSet.data.result.join('\n');
        }
        break;

      default:
        responseText = 'Intent desconhecida.';
    }

    const response = {
      fulfillmentText: responseText,
    };

    res.json(response);
  } catch (error) {
    console.error('Error:', error);
    res.json({ fulfillmentText: error?.response?.data?.message || 'Ocorreu um erro' });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
