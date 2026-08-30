class Api::V1::TripsController < ApplicationController
  include ResourceScope

  before_action :find_trip, only: [:show, :update, :destroy]

  def index
    @trips = current_user.trips

    render json: { result: "success", data: @trips }
  end

  # GET /trips/1
  def show
    render json: @trip
  end

  # POST /trips
  def create
    @trip = Trip.new(trip_params)
    if @trip.save
      @trip_user = @trip.trip_users.create(user_id: current_user.id)
      render json: { trip: @trip, tripuser: @trip_user }, status: :created
    else
      render json: @trip.errors, status: :unprocessable_entity
    end
  end

  # PATCH/PUT /trips/1
  def update
    if @trip.update(trip_params)
      render json: @trip
    else
      render json: @trip.errors, status: :unprocessable_entity
    end
  end

  # DELETE /trips/1
  def destroy
    @trip.destroy
    head :no_content
  end

  #GET /trips and /users
  def group
    @trips = current_user.trips

    render json: { result: "success", data: @trips }
  end

  private

  def find_trip
    @trip = accessible_trips.find_by(id: params[:id])
    not_found!("Trip") unless @trip
  end

  def trip_params
    params.require(:trip).permit(:start_date, :end_date, :name, :img_url, :destination, :city_name)
  end
end
